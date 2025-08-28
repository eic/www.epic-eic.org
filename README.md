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

