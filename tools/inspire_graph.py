#!/usr/bin/env python3
"""Build the ePIC publication/reference graph from InspireHEP.

Reads ``_data/publications.yml``, resolves every InspireHEP key in it to a
record, walks the reference lists of those records, and writes
``assets/data/publications_graph.json`` for ``assets/js/pubgraph.js`` to draw.

Two kinds of node end up in the graph:

* the publications named in ``_data/publications.yml`` ("primaries"), split
  into ePIC collaboration papers and ePIC collaborator papers, and
* records *outside* that list cited by MORE than ``threshold`` of them
  ("externals") -- which is what surfaces the EIC White Paper and the EIC
  Yellow Report without anyone having to name them.

API responses are cached under ``.cache/inspire/`` so repeated builds do not
hammer inspirehep.net.  Pass ``--no-cache`` for a fresh local build.

The graph logic (everything above ``Cache``) is pure: no network, no file I/O.
``tools/tests/test_inspire_graph.py`` exercises it from committed fixtures.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

API_ROOT = "https://inspirehep.net/api/literature"
WEB_ROOT = "https://inspirehep.net/literature"

USER_AGENT = (
    "epic-eic-website/1.0 (+https://github.com/eic/www.epic-eic.org; "
    "build-time publication graph)"
)

# Requested for every record.  Author lists run to thousands of entries on
# collaboration papers, so they are deliberately not requested -- see
# author_label() for how the byline is derived instead.
DISPLAY_FIELDS = (
    "control_number",
    "texkeys",
    "titles",
    "collaborations",
    "earliest_date",
    "citation_count",
    "arxiv_eprints",
    "dois",
)

# Reference lists are large; only fetched for records whose edges we draw.
REFERENCE_FIELDS = DISPLAY_FIELDS + ("references",)

REF_RECID_RE = re.compile(r"/literature/(\d+)/?$")
# Matches "ePIC" and subsystem collaborations such as "ePIC Dual-RICH
# subsystem", but not an unrelated name that merely starts with those
# letters ("Epicurus" has no word boundary after "epic").
EPIC_RE = re.compile(r"^epic\b", re.IGNORECASE)


class FetchError(RuntimeError):
    """An InspireHEP request failed after exhausting retries."""


# --------------------------------------------------------------------------
# Graph construction -- pure functions, no network and no file I/O.
# --------------------------------------------------------------------------


def cited_recids(metadata):
    """Recids referenced by ``metadata``, as strings.

    References InspireHEP has not matched to a record carry no
    ``record.$ref``; there is nothing to draw an edge to, so they are skipped.
    Returning a set also means a reference listed twice counts once.
    """
    out = set()
    for ref in metadata.get("references") or []:
        ref_url = ((ref or {}).get("record") or {}).get("$ref")
        if not ref_url:
            continue
        match = REF_RECID_RE.search(ref_url)
        if match:
            out.add(match.group(1))
    return out


def citation_map(primaries):
    """``{citing recid -> set of cited recids}``, with self-citations dropped."""
    return {
        recid: cited_recids(metadata) - {recid}
        for recid, metadata in primaries.items()
    }


def external_counts(cmap, primary_ids):
    """``{cited recid -> number of distinct primaries citing it}``, externals only."""
    counts = {}
    for cited in cmap.values():
        for recid in cited:  # a set, so each (citing, cited) pair counts once
            if recid in primary_ids:
                continue
            counts[recid] = counts.get(recid, 0) + 1
    return counts


def select_externals(cmap, primary_ids, threshold):
    """Recids cited by MORE than ``threshold`` distinct primaries.

    Strictly greater: with the default threshold of 5, a record needs 6 citing
    publications to appear.  ``_data/publications.yml`` says so in a comment.
    """
    counts = external_counts(cmap, primary_ids)
    return {recid for recid, n in counts.items() if n > threshold}


def classify(metadata, is_primary):
    """One of ``collaboration``, ``collaborator`` or ``external``."""
    if not is_primary:
        return "external"
    for collaboration in metadata.get("collaborations") or []:
        if EPIC_RE.match((collaboration.get("value") or "").strip()):
            return "collaboration"
    return "collaborator"


def author_label(metadata, texkey):
    """Short byline for a node.

    Prefers the collaboration name.  Otherwise falls back to the texkey, which
    already begins with the first author's surname -- that is why the full
    author list never has to be downloaded.
    """
    for collaboration in metadata.get("collaborations") or []:
        value = (collaboration.get("value") or "").strip()
        if value:
            return "%s Collaboration" % value
    if texkey and ":" in texkey:
        return "%s et al." % texkey.split(":", 1)[0]
    return ""


def make_node(recid, metadata, group, in_degree, note=None):
    """One node of the graph payload."""
    texkeys = metadata.get("texkeys") or []
    texkey = texkeys[0] if texkeys else None

    titles = metadata.get("titles") or []
    raw_title = titles[0].get("title") if titles else None
    title = " ".join((raw_title or "").split()) or "(untitled)"

    eprints = metadata.get("arxiv_eprints") or []
    dois = metadata.get("dois") or []
    collaborations = [
        (c.get("value") or "").strip()
        for c in metadata.get("collaborations") or []
        if (c.get("value") or "").strip()
    ]

    date = metadata.get("earliest_date") or ""
    year = int(date[:4]) if date[:4].isdigit() else None

    return {
        "id": recid,
        "texkey": texkey,
        "title": title,
        "label": note or texkey or recid,
        "year": year,
        "authors": author_label(metadata, texkey),
        "collaboration": collaborations[0] if collaborations else None,
        "citations": metadata.get("citation_count"),
        "arxiv": eprints[0].get("value") if eprints else None,
        "doi": dois[0].get("value") if dois else None,
        "url": "%s/%s" % (WEB_ROOT, recid),
        "group": group,
        "in_degree": in_degree,
    }


def build_graph(primaries, externals, threshold, notes=None):
    """Assemble the node/link payload.

    ``primaries``  -- ``{recid: metadata}`` for the records in the YAML list
    ``externals``  -- ``{recid: metadata}`` for records that passed the threshold
    ``notes``      -- optional ``{recid: label}`` overrides from the YAML

    Externals are leaves: their own reference lists are never fetched, so the
    only edges into them come from primaries, and there are no
    external-to-external edges.  Everything is emitted in sorted order so the
    output is byte-stable across runs.
    """
    notes = notes or {}
    primary_ids = set(primaries)
    keep = set(externals)
    cmap = citation_map(primaries)

    links = []
    in_degree = {recid: 0 for recid in list(primaries) + list(externals)}
    for citing in sorted(cmap):
        for cited in sorted(cmap[citing]):
            if cited not in primary_ids and cited not in keep:
                continue
            links.append({"source": citing, "target": cited})
            in_degree[cited] = in_degree.get(cited, 0) + 1

    nodes = [
        make_node(recid, metadata, classify(metadata, True),
                  in_degree.get(recid, 0), notes.get(recid))
        for recid, metadata in sorted(primaries.items())
    ]
    nodes += [
        make_node(recid, metadata, "external",
                  in_degree.get(recid, 0), notes.get(recid))
        for recid, metadata in sorted(externals.items())
    ]

    return {"threshold": threshold, "nodes": nodes, "links": links}


# --------------------------------------------------------------------------
# Cache
# --------------------------------------------------------------------------


class Cache:
    """One JSON file per API response, under ``.cache/inspire/``."""

    def __init__(self, root, enabled=True, max_age_days=30):
        self.root = Path(root)
        self.enabled = enabled
        self.max_age = timedelta(days=max_age_days)

    def _path(self, key):
        return self.root / ("%s.json" % re.sub(r"[^A-Za-z0-9._-]", "_", key))

    def _read(self, key):
        path = self._path(key)
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None

    def get(self, key):
        """Fresh cached payload, or None when disabled, missing or stale."""
        if not self.enabled:
            return None
        entry = self._read(key)
        if entry is None:
            return None
        try:
            fetched = datetime.fromisoformat(entry["fetched_at"])
        except (KeyError, TypeError, ValueError):
            return None
        if datetime.now(timezone.utc) - fetched > self.max_age:
            return None
        return entry.get("payload")

    def get_stale(self, key):
        """Cached payload at any age -- the last resort under --fail-soft."""
        entry = self._read(key)
        return entry.get("payload") if entry else None

    def put(self, key, url, payload):
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(
                {
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                    "url": url,
                    "payload": payload,
                },
                indent=1,
            ),
            encoding="utf-8",
        )


# --------------------------------------------------------------------------
# InspireHEP client
# --------------------------------------------------------------------------


class Inspire:
    """Minimal InspireHEP REST client: polite, cached, and retrying."""

    def __init__(self, cache, delay=1.0, timeout=30, retries=4, verbose=False):
        self.cache = cache
        self.delay = delay
        self.timeout = timeout
        self.retries = retries
        self.verbose = verbose
        self._last_request = None

    def log(self, message):
        if self.verbose:
            print("  %s" % message, file=sys.stderr)

    def _throttle(self):
        if self._last_request is None:
            return
        gap = self.delay - (time.monotonic() - self._last_request)
        if gap > 0:
            time.sleep(gap)

    def _request(self, url):
        last_error = None
        for attempt in range(self.retries):
            self._throttle()
            request = urllib.request.Request(
                url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"}
            )
            try:
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    return json.loads(response.read().decode("utf-8"))
            except urllib.error.HTTPError as error:
                last_error = error
                if error.code not in (429, 500, 502, 503, 504):
                    raise FetchError("HTTP %s for %s" % (error.code, url)) from error
                wait = _retry_after(error) or 2 ** attempt
                self.log("HTTP %s, retrying in %ss" % (error.code, wait))
                time.sleep(wait)
            except (urllib.error.URLError, TimeoutError, ValueError) as error:
                last_error = error
                self.log("%s, retrying" % error)
                time.sleep(2 ** attempt)
            finally:
                self._last_request = time.monotonic()
        raise FetchError("gave up on %s after %d attempts: %s"
                         % (url, self.retries, last_error))

    def _get(self, url, cache_key):
        payload = self.cache.get(cache_key)
        if payload is not None:
            self.log("cache hit  %s" % cache_key)
            return payload
        self.log("fetching   %s" % cache_key)
        try:
            payload = self._request(url)
        except FetchError:
            stale = self.cache.get_stale(cache_key)
            if stale is not None:
                self.log("request failed, using stale cache for %s" % cache_key)
                return stale
            raise
        self.cache.put(cache_key, url, payload)
        return payload

    def resolve_key(self, key):
        """InspireHEP key -> recid string.  Returns None when nothing matches.

        A bare number is already a recid.  Anything else is treated as a
        texkey and looked up.
        """
        key = str(key).strip()
        if key.isdigit():
            return key
        query = urllib.parse.urlencode(
            {"q": 'texkeys:"%s"' % key, "fields": "control_number,texkeys", "size": 2}
        )
        payload = self._get("%s?%s" % (API_ROOT, query), "texkey/%s" % key)
        hits = (payload.get("hits") or {}).get("hits") or []
        if not hits:
            return None
        if len(hits) > 1:
            print("warning: texkey %s matched %d records, using the first"
                  % (key, len(hits)), file=sys.stderr)
        return str(hits[0]["metadata"]["control_number"])

    def fetch_record(self, recid, with_references=False):
        """Record metadata for ``recid``."""
        fields = REFERENCE_FIELDS if with_references else DISPLAY_FIELDS
        suffix = "refs" if with_references else "meta"
        query = urllib.parse.urlencode({"fields": ",".join(fields)})
        payload = self._get(
            "%s/%s?%s" % (API_ROOT, recid, query),
            "literature/%s.%s" % (recid, suffix),
        )
        return payload.get("metadata") or {}


def _retry_after(error):
    try:
        return int(error.headers.get("Retry-After"))
    except (AttributeError, TypeError, ValueError):
        return None


# --------------------------------------------------------------------------
# Driver
# --------------------------------------------------------------------------


def load_config(path):
    """Parse ``_data/publications.yml`` into ``(threshold, entries)``."""
    try:
        import yaml
    except ImportError:
        sys.exit("PyYAML is required: pip install PyYAML")

    with open(path, encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}

    threshold = config.get("threshold", 5)
    entries = config.get("publications") or []
    normalised = []
    for entry in entries:
        if isinstance(entry, dict):
            key = entry.get("key")
            note = entry.get("note")
        else:
            key, note = entry, None
        if key is None:
            continue
        normalised.append((str(key).strip(), note))
    return threshold, normalised


def collect_primaries(client, entries, problems):
    """``({recid: metadata}, {recid: note})`` for the configured publications.

    A key that cannot be fetched is reported and skipped rather than aborting
    the run: one withdrawn record, or one request that times out, should not
    cost the other publications their place in the graph.
    """
    primaries, notes = {}, {}
    for key, note in entries:
        try:
            recid = client.resolve_key(key)
            if recid is None:
                problems.append("no InspireHEP record for key %r" % key)
                continue
            if recid in primaries:
                problems.append("key %r duplicates record %s" % (key, recid))
                continue
            primaries[recid] = client.fetch_record(recid, with_references=True)
        except FetchError as error:
            problems.append("could not fetch %r: %s" % (key, error))
            continue
        if note:
            notes[recid] = note
    return primaries, notes


def collect_externals(client, recids, problems):
    """``{recid: metadata}`` for the records that passed the threshold."""
    externals = {}
    for recid in sorted(recids):
        try:
            externals[recid] = client.fetch_record(recid)
        except FetchError as error:
            problems.append("could not fetch cited record %s: %s" % (recid, error))
    return externals


def report(problems):
    for problem in problems:
        print("warning: %s" % problem, file=sys.stderr)


def parse_args(argv):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repo", default=Path(__file__).resolve().parent.parent,
                        help="repository root (default: alongside this script)")
    parser.add_argument("--config", default="_data/publications.yml")
    parser.add_argument("--output", default="assets/data/publications_graph.json")
    parser.add_argument("--cache-dir", default=".cache/inspire")
    parser.add_argument("--no-cache", action="store_true",
                        help="ignore cached responses and refetch everything")
    parser.add_argument("--max-age-days", type=int, default=30,
                        help="treat cached responses older than this as stale")
    parser.add_argument("--delay", type=float, default=1.0,
                        help="minimum seconds between API requests")
    parser.add_argument("--retries", type=int, default=4,
                        help="attempts per request before giving up on it")
    parser.add_argument("--fail-soft", action="store_true",
                        help="keep any existing output and exit 0 if InspireHEP "
                             "is unreachable (use in CI so a site deploy is "
                             "never blocked by an API outage)")
    parser.add_argument("-v", "--verbose", action="store_true")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    repo = Path(args.repo).resolve()
    output = repo / args.output

    threshold, entries = load_config(repo / args.config)
    if not entries:
        print("warning: no publications configured in %s" % args.config,
              file=sys.stderr)

    cache = Cache(repo / args.cache_dir, enabled=not args.no_cache,
                  max_age_days=args.max_age_days)
    client = Inspire(cache, delay=args.delay, retries=args.retries,
                     verbose=args.verbose)

    problems = []
    primaries, notes = collect_primaries(client, entries, problems)
    cmap = citation_map(primaries)
    wanted = select_externals(cmap, set(primaries), threshold)
    externals = collect_externals(client, wanted, problems)

    # Nothing came back at all: InspireHEP is unreachable, or every key is bad.
    if entries and not primaries:
        report(problems)
        if not args.fail_soft:
            print("error: could not fetch any of the %d configured publications"
                  % len(entries), file=sys.stderr)
            return 1
        if output.exists():
            print("warning: could not reach InspireHEP; keeping the existing %s"
                  % args.output, file=sys.stderr)
            return 0
        # No previous output to fall back on.  Write an empty but valid graph
        # so the page shows its placeholder, rather than failing the build and
        # taking the whole site deploy down with it.
        print("warning: could not reach InspireHEP and there is no previous %s; "
              "writing an empty graph so the build can continue"
              % args.output, file=sys.stderr)

    graph = build_graph(primaries, externals, threshold, notes)
    graph["generated"] = (
        datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    )
    # Tell the page the data is incomplete, so an outage cannot quietly look
    # like a collaboration that has stopped publishing.
    if problems:
        graph["degraded"] = True
        graph["expected_nodes"] = len(entries)

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(graph, indent=1, sort_keys=True) + "\n",
                      encoding="utf-8")

    counts = {}
    for node in graph["nodes"]:
        counts[node["group"]] = counts.get(node["group"], 0) + 1
    print("wrote %s: %d nodes (%s), %d links" % (
        args.output,
        len(graph["nodes"]),
        ", ".join("%d %s" % (n, g) for g, n in sorted(counts.items())) or "none",
        len(graph["links"]),
    ))

    report(problems)
    return 0


if __name__ == "__main__":
    sys.exit(main())
