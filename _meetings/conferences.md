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

##### Table of Contents
- [Policies and Procedures](#policies-and-procedures)
- [Links of Interest](#links-of-interest)
- [Submission and Review Procedure](#submission-and-review-procedure)
- [List of Events](#list-of-events)

{{ site.hr }}

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
* In accordance with the requirements layed out in the [ePIC Conference and Talks Policy](https://zenodo.org/records/14052729){:target="_blank"}, this section summarizes the steps collaborators should follow when submitting a presentation for review and approval.
* __NOTE:__  Please ensure you submit your material to the first-step approval entity __at least 8 business days before it is due.__ This is essential for providing adequate time for review and ensuring the reviewers are not overwhelmed. Presenters are of course free (and encouraged!) to discuss their material within their working group / DSC in advance of the 8 day limit.
* __NOTE:__  The Collaborative Tools Task Force is actively working on tools to help automate the review workflow. As these services become available the steps enumerated below will necessarily change. We will communicate these changes as widely as we can, but please refer back to this section before you begin submitting a presentation for review to see the latest instructions.

###### Procedure for Submitting Presentations for Review and Approval:

0. Presenter: Before submitting material for review and approval, please sign up for the talks mailing list (__epic-talks-l@lists.bnl.gov__) and the ePIC community on [Zenodo](https://www.epic-eic.org/documents/zenodo.html){:target="_blank"}
1. Presenter: At your earliest convenience, inform the CTC (epic-ctc-l@lists.bnl.gov) that you plan to present and provide topic and details of the conference/workshop. This applies for both invited and contributed presentations
2. Presenter: Provide material (abstract text, talk, poster, etc) to the appropriate first-step approval entity email list (see section III.3.1 of the [ePIC Conference and Talks Policy]((https://zenodo.org/records/14052729){:target="_blank"}) no later than 8 business days before it is due
   * Material can be provided via email attachement or uploaded to Zenodo and shared via link (Zenodo can handle multiple versions of a record). Note: mailing lists may have problems with large attachments
   * When uploading to Zenodo, please be sure to include the Keyword for your conference (see table under "List of Events"). If your conference is not listed, please contact the CTC
   * Contact CTC if you are confused as to whom should be contacted as the first-step approval entity
3. First-Step Reviewer: Provide feedback and communicate approval/disapproval decision within 4 weekdays of receiving material. If decision is approval, please inform appropriate second-step approval entity that material is ready for review
   * Feedback and decisions should be communicated directly to the presenter and to the working group / DSC list
4. Presenter: After first-step approval entity has signed off, upload material to Zenodo (either as new record, or if record already exists, new version) and send link and solicitation for Collaboration-wide feedback to the epic-talks mailing list
5. Second-Step Reviewer: Second-step approval entity should check that all comments are incorporated into the presentation material and then communicate the final approval/disapproval decision to the ePIC talks mailing list
6. Presenter: Please ensure that the final version of the presentation (the one shown at the conference) is uploaded to Zenodo and made public

* __Reminder:__ For general ePIC overview talks that cover all aspects of the ePIC program, material should be sent directly to the epic-talks mailing list for second-step approval and comment from the Collaboration __at least 7 weekdays before the conference or abstract deadline__ 

{{ site.hr }}

##### List of Events
* The table below lists conferences with ePIC participation, or of immediate interest to our Collaboration.
* The left column in the tables below contains links to the respective conferences' pages (if available).
* The right column contains official ePIC keywords assigned to each conference.
Keywords rendered as clickable links will list the ePIC items on archived on Zenodo, related to the conference (or meeting).
* Please note that some conference uploads (especially for future conferences) may be still pending i.e. not all queries will produce results.
* For easy access, the conferences are grouped by the year.
* When suggesting a keyword for a new conference, please consult the guidelines on top of the [keywords page](/documents/keywords.html).

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

