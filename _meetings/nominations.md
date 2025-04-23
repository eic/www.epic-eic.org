---
title: ePIC Conference Speaker Nominations
description: Nominations of speakers for conferences
name: nominations
layout: default
---

{% include layouts/title.md %}

{{ site.hr }}

[Speaker nomination form](https://urldefense.com/v3/__https://forms.gle/qQxf1wW5dUSVyTdh7__;!!P4SdNyxKAPE!AskwdefEZuyR_XCi11Etl3Q6H9pAbJA28BZhV5oJpkftch2qIqil8Dn0nKb3L7XtJtn1kznV2RnzTVE$){:target="_blank"}

{% comment %}

{% assign conferences=site.data.keywords | where_exp: "item", "item.category=='conference'" | sort: "year"  %}

{% for conf in conferences reversed %}
{% if conf.nominations %}

#### {{ conf.description }}

{% include layouts/simple_table_nom.md data=conf.nominations %}

---

{% endif %}
{% endfor %}
{% endcomment %}


{% comment %}
{% for nom in conf.nominations %}
{{ nom.name }}
{% endfor %}
{% endcomment %}