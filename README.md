# The ePIC website

## About
This is the ePIC collaboration website - work in progress.

## Current work items

Please contact T.Ullrich for details.


### New features

WG descriptions are now kept in the file _wg.yml_ in the *_data_* folder

### Content recently updated:
* Committees -- _Conferences and Talks_ updated
* Physics
   * _Semi-Inclusive_
   * _Exclusive and Diffraction_
   * _Jets and HF_
   * _BSM and EW_

* Keywords (a stub)

### Filtering - examples

This is an example of applying filters in the _Liquid_ language used in the web pages
templates:

```
{% assign nominations=site.data.keywords | where_exp: "item", "item.category=='conference'" | where_exp: "item", "item.year==2024" %}

{% comment %}
{% assign nom= nom | where: "nominations" %}
{% endcomment %}

{% for nom in nominations %}
{% if nom.nominations %}
{{ nom.nominations.name }}

{% endif %}
{% endfor %}
```

## Running local build

```bash
bundle exec jekyll serve --port 8000
```

That assumes you did the installation of Ruby/Jekyll:
* https://jekyllrb.com/

## Publication graph

`/public/publications.html` draws an interactive reference graph of ePIC
publications. Which publications appear is configured in
`_data/publications.yml` by InspireHEP key -- either a texkey
(`Accardi:2012qut`) or a bare record id (`1206324`).

The graph reaches one step out from that list in both directions, and both
sides are discovered automatically rather than listed by hand:

* works that more than `threshold` of the configured publications **cite** --
  the shared foundations, which is how the EIC White Paper and the EIC Yellow
  Report appear, and
* works that themselves **cite** more than `threshold` of them -- the
  literature building on ePIC results.

Neither side is expanded further, so the graph stays one hop deep on each side.

The graph data is fetched from the InspireHEP API at build time. To build it
locally (needs Python 3 and PyYAML):

```bash
pip install PyYAML
python3 tools/inspire_graph.py          # writes assets/data/publications_graph.json
bundle exec jekyll serve --port 8000
```

Responses are cached under `.cache/inspire/` so repeated builds do not keep
hitting inspirehep.net. Both the cache and the generated JSON are gitignored.
Useful flags:

| Flag | Effect |
|---|---|
| `--no-cache` | ignore the cache and refetch everything |
| `--max-age-days N` | treat cached responses older than N days as stale (default 30) |
| `--fail-soft` | keep the existing output and exit 0 if InspireHEP is unreachable (used in CI) |
| `-v` | log every request and cache hit |

Without that step the page still builds -- it shows a placeholder in place of
the graph, plus the publication list from `_data/publications.yml`.

To regenerate the publication list itself from InspireHEP:

```bash
python3 tools/seed_publications.py > _data/publications.yml
```

Review the result before committing; the query only finds ePIC *collaboration*
papers, so papers by ePIC collaborators have to be added by hand.

Nodes in the graph are labelled with the publication title, wrapped to two
lines and cut with an ellipsis when it is still too long; the full title is
always in the tooltip and the publication list. Add a `note` to an entry to
label that node with a short name instead.

Tests for the graph logic run from committed fixtures, with no network:

```bash
python3 tools/tests/test_inspire_graph.py
```

### Deployment

The site is built and deployed by `.github/workflows/pages.yml`, which runs the
InspireHEP fetch before `jekyll build`. This requires **Settings -> Pages ->
Source** to be set to **GitHub Actions**; the classic "deploy from a branch"
build cannot run the fetch step.

Netlify builds the pull-request deploy previews, and `netlify.toml` runs the
same fetch there so a preview shows the same graph as production. The graph
step is separated from the Jekyll build by `;` rather than `&&`, so a preview
degrades to the placeholder rather than failing if InspireHEP is unreachable.

The page loads d3 from a CDN with a Subresource Integrity hash. If d3 is ever
upgraded, the pinned version and the hash in `_public/publications.md` must be
updated together:

```bash
curl -s https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js \
  | openssl dgst -sha384 -binary | openssl base64 -A
```

