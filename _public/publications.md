---
title: Publications
name: publications
layout: public
description: Publications of the ePIC Collaboration, the literature they build on, and the work building on them, as an interactive reference graph.
---

{% include layouts/title.md %}

Publications by the ePIC Collaboration and by ePIC collaborators, listed below
and drawn as a reference graph. An arrow runs from a publication to the work it
cites.

{% assign n = site.data.publications.threshold | default: 5 %}
Alongside the ePIC publications themselves, the graph reaches one step out in
both directions. It includes works from outside the collaboration that **more
than {{ n }}** of these publications cite &mdash; the shared foundations of the
ePIC programme, such as the EIC White Paper and the EIC Yellow Report &mdash;
and works that themselves cite **more than {{ n }}** of them, which is the
literature building on ePIC results. Nothing outside the collaboration is
listed by hand; a work appears once enough ePIC publications point at it, or it
points at enough of them.

<div id="pubgraph-controls"></div>

##### Publication list

<table id="pubgraph-table" width="100%" border="1">
<thead>
<tr><th>Publication</th><th>Year</th><th>Category</th><th>Cited by</th><th>Cites</th><th>Citations</th></tr>
</thead>
<tbody>
{%- assign configured = site.data.publications.publications -%}
{%- if configured and configured.size > 0 -%}
{%- for publication in configured -%}
<tr><td><a href="https://inspirehep.net/search?q={{ publication.key | url_encode }}" target="_blank" rel="noopener">{{ publication.note | default: publication.key }}</a></td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td></tr>
{%- endfor -%}
{%- else -%}
<tr><td colspan="6">No publications are configured yet. Add InspireHEP keys to <code>_data/publications.yml</code>.</td></tr>
{%- endif -%}
</tbody>
</table>

<p><small><em>Cited by</em> and <em>Cites</em> count connections within this graph only; <em>Citations</em> is the total recorded by InspireHEP.</small></p>

##### Reference graph

Hover or focus a node for its details, drag to rearrange, scroll to zoom, and
click through to the record on [InspireHEP](https://inspirehep.net).

<div id="pubgraph" data-src="{{ '/assets/data/publications_graph.json' | relative_url }}">
<p class="pubgraph-status">Loading the publication graph&hellip;</p>
<noscript><p class="pubgraph-status">The interactive graph needs JavaScript. The full list of publications is in the table above.</p></noscript>
</div>

<p><small>The graph and this list are built from <code>_data/publications.yml</code>; metadata is retrieved from the InspireHEP API when the site is built.</small></p>

<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js" integrity="sha384-CjloA8y00+1SDAUkjs099PVfnY2KmDC2BZnws9kh8D/lX1s46w6EPhpXdqMfjK6i" crossorigin="anonymous"></script>
<script src="{{ '/assets/js/pubgraph.js' | relative_url }}"></script>
