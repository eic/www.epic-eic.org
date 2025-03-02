{% include layouts/title.md %}

{% assign group = site.data.wg | where: "name", page.name | first %}
{% assign conveners = group.conveners  | split: ", " %}

* __Charge__
    * {{ group.mission_statement }} 
* __Conveners__
    {% for convener in conveners -%}
    {%- assign person = site.data.people | where: "name", convener | first -%}
    * {{ person.full }} (<{{ person.email }}>)
    {% endfor %}


{%- if group.useful_links %}
* __Useful Links__
    {% for link in group.useful_links -%}
    {%-  assign info = link | split: ", " -%}
    * [{{ info[0] }}]({{ info[1]}}){:target="_blank"}
    {% endfor %}
{%- endif %}

{%- if group.get_involved %}
* __Get involved__
    * {{ group.get_involved }}
{%- endif %}

* __Contact and administrative info__
{%- if group.list %}
    * Mailing list: <{{ group.list }}>.
    * To subscribe, visit: [{{ group.list_sub }}]({{ group.list_sub }}){:target="_blank"}.
{%- endif %}
    * Indico: [{{ group.indico }}]({{ group.indico }}){:target="_blank"}
{%- if group.mattermost %}    
    * Mattermost: [{{ group.mattermost }}]({{ group.mattermost }}){:target="_blank"}
{%- endif %}
{%- if group.wiki %}
    * Wiki: [{{ group.wiki }}]({{ group.wiki }}){:target="_blank"}
{%- endif %}
{%- if group.meetings %}
* __Meetings__
    * {{ group.meetings }}
{%- endif %}
   <hr/>
