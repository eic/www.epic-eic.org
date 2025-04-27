---
title: ePIC Software FAQ
description: ePIC Software FAQ
name: faq
layout: default
---

<h4>ePIC Software FAQ</h4>



Welcome to the **Frequently Asked Questions** page!

* Please use the helpdesk: [https://chat.epic-eic.org/](https://chat.epic-eic.org/){:target="_blank"} on Mattermost for urgent correspondence.
* Submit new questions and comments by email to the relevant list: [epic-sc-faq-l@lists.bnl.gov](mailto:epic-sc-faq-l@lists.bnl.gov).

---

<h4>List of Q/A</h4>

* TOC
{:toc}

---

##### Q: How can we browse the simulation output from a specific campaign and locate certain output files?
**A:** Visit the [epicprod website](https://eic.github.io/epic-prod/campaigns/campaigns_reco.html)
to view the list of avaiable campaigns. Pick a campaign that you want to view in detail.
For example: [23.12.0](https://eic.github.io/epic-prod/RECO/23.12.0/).
Here, you will find the output directories listed in a nested tree structure. The directory nomenclature usually follows the pattern:
```
    <base directory>/<campaign tag>/<detector config>/<physics processes>/<generator release tag if available>/<electron momentum>x<proton momentum>/<q2 range>/
```

The preferred method to list the files in a directory is to use the xrdfs interface within eic-shell container. For example:
```
    xrdfs root://dtn-eic.jlab.org   
    ls /volatile/eic/EPIC/RECO/23.09.1/epic_craterlake/DIS/NC/18x275/minQ2=1000
```
See more details [here](https://eic.github.io/epic-prod/documentation/faq.html){:target="_blank"}.

---

##### Q: What input datasets are used in a particular production campaign and where can I find them?
**A:** The directory structure of the input datasets mimic the directory structure of the output files from `<physics processes>` onwards. Consider, the output files under `root://dtn-eic.jlab.org//volatile/eic/EPIC/RECO/23.12.0/epic_craterlake/DIS/NC/10x100/minQ2=1`. The corresponding input datasets can be found in the following manner:

```
    xrdfs root://dtn-eic.jlab.org
    ls /volatile/eic/EPIC/EVGEN/DIS/NC/10x100/minQ2=1
```

---

##### Q: What is the procedure to introduce a new dataset into a production campaign or replace an existing one?
**A:** Follow the input dataset creation [guidelines](https://eic.github.io/epic-prod/documentation/input_preprocessing.html){:target="_blank"} listed in the epic-prod website.

---

##### Q: How can we load files into ROOT directly from xrootd?
**A:** Enter the full file path including server address using root TFile::Open. For example:
```
    auto f = TFile::Open("root://dtn-eic.jlab.org//volatile/eic/EPIC/RECO/23.12.0/epic_craterlake/DIS/NC/18x275/minQ2=1000/pythia8NCDIS_18x275_minQ2=1000_beamEffects_xAngle=-0.025_hiDiv_1.0000.eicrecon.tree.edm4eic.root")
```
See more details [here](https://eic.github.io/epic-prod/documentation/faq.html){:target="_blank"}.

---

##### Q: How can we copy files from xrootd?
**A:** Use xrdcp with full path and local destination directory. For example:

```
xrdcp root://dtn-eic.jlab.org//volatile/eic/EPIC/RECO/23.12.1/epic_craterlake/DIS/NC/18x275/minQ2=1000/pythia8NCDIS_18x275_minQ2=1000_beamEffects_xAngle=-0.025_hiDiv_1.0000.eicrecon.tree.edm4eic.root <local destination>
```

---

##### Q: What is included in the campaign, and what are the major changes compared to before?
**A:** We version track the [epic](https://github.com/eic/epic/releases){:target="_blank"} and [eicrecon](https://github.com/eic/eicrecon/releases){:target="_blank"}
repositories and the new features introduced in a campaign are tracked in the release notes.
For example: [epic-23.12.0](https://github.com/eic/epic/releases/tag/23.12.0){:target="_blank"} represents the software
changes introduced in December campaign. As of December, 2023 we have also began enforcing version tracking on our input datasets.

---

##### Q: How can we effectively use the information stored in EICRecon rootfile outputs, such as matching reconstructed particles to their MC particles?
**A:** To an extent, this is covered in the [dRICH tutorials](https://github.com/eic/drich-dev/blob/tutorial/doc/tutorials/3-running-reconstruction.md){:target="_blank"}, starting at session 3 and partly covered in existing [recorded tutorials](https://indico.bnl.gov/event/18373/){:target="_blank"}. _TODO:_ Probably needs to be supplemented with example codes.

---

##### Q: How can we apply beam effects, including adjusting the ion beam when using a particle gun?
**A:** Beam effects are handled by the [afterburner](https://github.com/eic/afterburner){:target="_blank"}, which expects HepMC3 input. They cannot be simply turned on in just the npsim particle gun.

---

##### Q: How do we check and change beam magnet settings for both simulation and reconstruction?
**A:**  _TODO:_ Changing magnet configuration in reconstruction makes little sense. Checking and changing it for simulation should be answered by the prod group.

---

##### Q: What is the best practice for analyzing EICrecon output, especially regarding hadron PID likelihoods?

**A:**  _TODO:_ Needs an updated analysis tutorial. I don't believe at this point we have a simple unified PID likelihood approach.

---

##### Q: How can we develop a benchmark for an analysis code to pass on to the validation software team?

**A:** _TODO:_ We originally planned a dedicated "Tutorial: Writing physics benchmarks that run automatically and reproducibly" - this needs to be revisited. Otherwise, Dmitry K, Wouter, Sylvester may be able to write up something short. This is a good FAQ candidate really, if we can get this answered.

---

##### Q: How can we access various (SI)DIS variables through different reconstruction methods?

**A:** _TODO:_ Things like ``InclusiveKinematicsDA.cc`` are part of EicRecon, but I don't know how to use it. I don't believe it's calculated by default during campaigns, so one would still need an analysis level version. Would be good example analysis code, and I'm sure it exists in many forms on various people's laptops.

---

##### Q: How do we match tracks and clusters from the calorimeters?

---

##### Q: How can we access hadron and electron PID data?

---

##### Q: How do we navigate from reconstructed to truth information?

**A:** Needs a refreshed tutorial; needs example code

---

##### Q: Is there an organized repository or wiki that guides newcomers to the right tutorials and slides?

**A:** Yes, but the dRICH one is closest, plus the tutorials indico. _TODO:_ Should be combined and front and center of the landing page.

---

##### Q: Are there quick starter-code examples (Analyzer macros) for accessing branch information and creating physics plots?

**A:** _TODO:_ Yes, but not well organized and more is better.

---

##### Q: Can you provide an example of analyzing EICrecon data using basic methods?
**A:** [https://indico.bnl.gov/event/18373/](https://indico.bnl.gov/event/18373/){:target="_blank"} has some, so does the dRICH tutorial. _TODO:_ Needs more example code.
