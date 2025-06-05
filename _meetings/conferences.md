---
title: Conferences and Meetings with ePIC participation
name: conferences
layout: default
years:
- 2025
- 2024
- 2023
---
{% include layouts/title.md %}

##### Policies and Procedures

* __The Conference and Talk Committee (CTC)__ is responsible for the oversight and management of all oral and poster presentations given at scientific conferences on behalf of the Collaboration. 
For contact information and more detail, please see [the committee web page](/collaboration/committees.html){:target="_blank"}.
* The [ePIC Conference and Talks Policy](https://zenodo.org/records/14052729){:target="_blank"} was adopted by Council on November 7, 2024 (restricted to members).
* If you plan on getting involved in the Collaboration activity at various conferences and workshops, please make a point of subscribing to the dedicated
mailing list for Collaboration-level conference material approval: __epic-talks-l@lists.bnl.gov__
* [Speaker nomination form](https://urldefense.com/v3/__https://forms.gle/qQxf1wW5dUSVyTdh7__;!!P4SdNyxKAPE!AskwdefEZuyR_XCi11Etl3Q6H9pAbJA28BZhV5oJpkftch2qIqil8Dn0nKb3L7XtJtn1kznV2RnzTVE$){:target="_blank"}

{{ site.hr }}

##### Links of Interest
* The Project Sharepoint folder with pictures and other documents of interest is available at [this link](https://brookhavenlab.sharepoint.com/:f:/s/EICPublicSharingDocs/EujNGT5IzzxHtG0hMeDpu-cBihVczsqTO6L7CbfkXLHQ-Q?e=5bfcjY){:target="_blank"}
* A general list of the EIC-related conferences can be found on a separate [website maintained by the EICUG](https://eic-conferences.lbl.gov/home){:target="_blank"}.

{{ site.hr }}

##### Submission and Review Procedure
* In accordance with the requirements layed out in the [ePIC Conference and Talks Policy](https://zenodo.org/records/14052729){:target="_blank"}, this section details the steps collaborators should follow when submitting a presentation for review and approval.
* __NOTE:__  The Collaborative Tools Task Force is actively working on tools to help automate the review workflow. As these services become available the steps enumerated below will necessarily change. We will communicate these changes as widely as we can, but please refer back to this section before you begin submitting a presentation for review to see the latest instructions.

__Procedure for Submitting Presentations for Review and Approval:__
0. 

{{ site.hr }}

##### List of Events
* The table below lists conferences with ePIC participation, or of immediate interest to our Collaboration.
* The left column in the tables below contains links to the respective conferences' pages (if available).
* The right column contains official ePIC keywords assigned to each conference.
Keywords rendered as clickable links will list the ePIC items on archived on Zenodo, related to the conference (or meeting).
* Please note that some conference uploads (especially for future conferences) may be still pending i.e. not all queries will produce results.
* For easy access, the conferences are grouped by the year.

{{ site.hr }}

{% for year in page.years %}
{% assign c4y=site.data.keywords | where_exp: "item", "item.year==year" | where_exp: "item", "item.category=='conference'" | sort: "name" %}

<h5>{{ year }}</h5>
<table width="80%" border="1">
{% for conference in c4y %}
  <tr>
    {% if conference.url == '' %}
    <td width="80%"><nobr>{{ conference.description }}</nobr></td>
    {% else %}
    <td width="80%"><nobr><a href="{{ conference.url }}" target="_blank">{{ conference.description }}</a></nobr></td>
    {% endif %}
    {% if conference.upload != false %}
    <td width="20%"><nobr><a href="{{ site.zenodo_query_base }}{{ conference.name }}" target="_blank">{{ conference.name }}</a></nobr></td>
    {% else %}
    <td width="20%"><nobr>{{ conference.name }}</nobr></td>
    {% endif %}
  </tr>
{% endfor %}
</table>

<br/>


---

{% endfor %}


---

