"""Tests for the pure graph logic in tools/inspire_graph.py.

Runs entirely from committed fixtures -- no network, so it works anywhere:

    python3 -m unittest discover -s tools/tests -t .
"""

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from inspire_graph import (  # noqa: E402
    build_graph,
    citation_map,
    cited_recids,
    classify,
    external_counts,
    make_node,
    select_externals,
)

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def fixture(name):
    with open(FIXTURES / ("%s.json" % name), encoding="utf-8") as handle:
        return json.load(handle)


def citing_record(*recids):
    """A minimal record whose reference list points at ``recids``."""
    return {
        "references": [
            {"record": {"$ref": "https://inspirehep.net/api/literature/%s" % r}}
            for r in recids
        ]
    }


class CitedRecidsTest(unittest.TestCase):
    def test_parses_recids_out_of_ref_urls(self):
        self.assertEqual(
            cited_recids(fixture("literature_collaboration")),
            {"1206324", "1958350", "2812345"},
        )

    def test_reference_listed_twice_counts_once(self):
        record = fixture("literature_collaboration")
        listed = [
            r for r in record["references"]
            if (r.get("record") or {}).get("$ref", "").endswith("1206324")
        ]
        self.assertEqual(2, len(listed), "fixture should list 1206324 twice")
        self.assertEqual(1, sum(1 for r in cited_recids(record) if r == "1206324"))

    def test_reference_without_record_ref_is_skipped(self):
        record = fixture("literature_collaboration")
        unmatched = [r for r in record["references"] if not r.get("record")]
        self.assertEqual(1, len(unmatched), "fixture should hold one unmatched reference")
        # 5 reference entries -> 3 distinct recids: one duplicate and one
        # unmatched preprint both drop out.
        self.assertEqual(5, len(record["references"]))
        self.assertEqual(3, len(cited_recids(record)))

    def test_missing_references_key(self):
        self.assertEqual(set(), cited_recids({}))


class CitationMapTest(unittest.TestCase):
    def test_drops_self_citations(self):
        # The fixture references its own recid, 2812345.
        cmap = citation_map({"2812345": fixture("literature_collaboration")})
        self.assertNotIn("2812345", cmap["2812345"])
        self.assertEqual({"1206324", "1958350"}, cmap["2812345"])


class ThresholdTest(unittest.TestCase):
    """"More than 5" means 6 citing publications, not 5."""

    def _cmap(self, n_citing):
        primaries = {
            str(9000 + i): citing_record("1206324") for i in range(n_citing)
        }
        return citation_map(primaries), set(primaries)

    def test_exactly_at_threshold_is_excluded(self):
        cmap, ids = self._cmap(5)
        self.assertEqual(5, external_counts(cmap, ids)["1206324"])
        self.assertEqual(set(), select_externals(cmap, ids, 5))

    def test_one_above_threshold_is_included(self):
        cmap, ids = self._cmap(6)
        self.assertEqual(6, external_counts(cmap, ids)["1206324"])
        self.assertEqual({"1206324"}, select_externals(cmap, ids, 5))

    def test_duplicate_reference_does_not_inflate_the_count(self):
        primaries = {"9000": citing_record("1206324", "1206324", "1206324")}
        cmap = citation_map(primaries)
        self.assertEqual(1, external_counts(cmap, set(primaries))["1206324"])

    def test_primaries_are_never_counted_as_external(self):
        primaries = {"9000": citing_record("9001"), "9001": {}}
        cmap = citation_map(primaries)
        self.assertEqual({}, external_counts(cmap, set(primaries)))


class ClassifyTest(unittest.TestCase):
    def test_collaboration_paper(self):
        self.assertEqual("collaboration", classify(fixture("literature_collaboration"), True))

    def test_collaborator_paper_has_no_epic_collaboration_tag(self):
        self.assertEqual("collaborator", classify(fixture("literature_collaborator"), True))

    def test_collaboration_match_is_case_insensitive(self):
        self.assertEqual("collaboration", classify({"collaborations": [{"value": "EPIC"}]}, True))

    def test_other_collaborations_do_not_match(self):
        self.assertEqual("collaborator", classify({"collaborations": [{"value": "STAR"}]}, True))

    def test_non_primary_is_always_external(self):
        self.assertEqual("external", classify(fixture("literature_collaboration"), False))


class MakeNodeTest(unittest.TestCase):
    def test_reads_display_metadata(self):
        node = make_node("2812345", fixture("literature_collaboration"), "collaboration", 3)
        self.assertEqual("Adkins:2024xyz", node["texkey"])
        self.assertEqual("Measurement of something at the ePIC detector", node["title"])
        self.assertEqual(2024, node["year"])
        self.assertEqual(17, node["citations"])
        self.assertEqual("2406.01234", node["arxiv"])
        self.assertEqual("ePIC", node["collaboration"])
        self.assertEqual("ePIC Collaboration", node["authors"])
        self.assertEqual("https://inspirehep.net/literature/2812345", node["url"])
        self.assertEqual(3, node["in_degree"])

    def test_byline_falls_back_to_the_texkey(self):
        node = make_node("2900001", fixture("literature_collaborator"), "collaborator", 0)
        self.assertEqual("Zurek et al.", node["authors"])

    def test_note_overrides_the_label(self):
        node = make_node("1206324", fixture("literature_external"), "external", 6, note="EIC White Paper")
        self.assertEqual("EIC White Paper", node["label"])

    def test_label_defaults_to_the_texkey(self):
        node = make_node("1206324", fixture("literature_external"), "external", 6)
        self.assertEqual("Accardi:2012qut", node["label"])

    def test_tolerates_an_empty_record(self):
        node = make_node("1", {}, "external", 0)
        self.assertEqual("(untitled)", node["title"])
        self.assertIsNone(node["year"])
        self.assertIsNone(node["arxiv"])
        self.assertEqual("1", node["label"])


class BuildGraphTest(unittest.TestCase):
    def setUp(self):
        # Six primaries all citing the White Paper, so it clears threshold 5.
        self.primaries = {
            str(9000 + i): citing_record("1206324") for i in range(6)
        }
        # One of them also cites another primary, and an under-threshold record.
        self.primaries["9000"] = citing_record("1206324", "9001", "7777777")
        self.externals = {"1206324": fixture("literature_external")}

    def test_node_groups_and_counts(self):
        graph = build_graph(self.primaries, self.externals, 5)
        groups = {}
        for node in graph["nodes"]:
            groups[node["group"]] = groups.get(node["group"], 0) + 1
        self.assertEqual({"collaborator": 6, "external": 1}, groups)

    def test_in_degree_matches_the_link_count(self):
        graph = build_graph(self.primaries, self.externals, 5)
        counted = {}
        for link in graph["links"]:
            counted[link["target"]] = counted.get(link["target"], 0) + 1
        for node in graph["nodes"]:
            self.assertEqual(counted.get(node["id"], 0), node["in_degree"], node["id"])

    def test_under_threshold_record_gets_no_node_and_no_edge(self):
        graph = build_graph(self.primaries, self.externals, 5)
        self.assertNotIn("7777777", [n["id"] for n in graph["nodes"]])
        self.assertNotIn("7777777", [l["target"] for l in graph["links"]])

    def test_primary_to_primary_edges_are_kept(self):
        graph = build_graph(self.primaries, self.externals, 5)
        self.assertIn({"source": "9000", "target": "9001"}, graph["links"])

    def test_output_is_stable_across_runs(self):
        first = build_graph(self.primaries, self.externals, 5)
        second = build_graph(dict(reversed(list(self.primaries.items()))), self.externals, 5)
        self.assertEqual(json.dumps(first, sort_keys=True), json.dumps(second, sort_keys=True))

    def test_empty_configuration_is_a_valid_graph(self):
        graph = build_graph({}, {}, 5)
        self.assertEqual([], graph["nodes"])
        self.assertEqual([], graph["links"])


if __name__ == "__main__":
    unittest.main()
