---
title: Jets and Heavy Flavor
description: Jets and Heavy Flavor
name: jets_hf
layout: default
---

{% include layouts/wg_top.md %}

__Simulations__
* Repository for event generation
  * https://github.com/eic/HFsim-PYTHIA
  * https://github.com/eic/HFsim-BeAGLE 
* D<sup>0</sup> samples
  * e+p: PYTHIA v8.306
    * 18x275
      * Each event contains at least one D<sup>0</sup> that can decay through any channels
      * Location: ``` SIDIS/D0_ABCONV/pythia8.306-1.0/18x275/hiDiv  ```
    * 10x100
      * Each event contains at least one D<sup>0</sup> that decays into π+K pair, and the decay daughters are within pseudorapidity of &plusmn;3.5
      * Location:
        * Q<sup>2</sup> > 1: ``` SIDIS/D0_ABCONV/pythia8.306-1.1/10x100/q2_1/hiDiv  ```
        * Q<sup>2</sup> > 100: ``` SIDIS/D0_ABCONV/pythia8.306-1.1/10x100/q2_100/hiDiv  ```
  * e+Au: BeAGLE v1.03.01
    * Each event contains at least one D<sup>0</sup> that decays into π+K pair
    * Q<sup>2</sup> > 1
    * Location:
      * 10x100: ``` epic_craterlake_without_zdc/SIDIS/D0_ABCONV/HFsim-BeAGLE/BeAGLE1.03.01-1.0/eAu/10x100/q2_1to10000 ``` 
      * 5x41: ``` epic_craterlake_without_zdc/SIDIS/D0_ABCONV/HFsim-BeAGLE/BeAGLE1.03.01-1.0/eAu/5x41/q2_1to10000 ``` 
* L<sub>c</sub> samples
  * e+p
    * 18x275
      * Each event contains at least one L<sub>c</sub> that can decay through any channels
      * Location: ``` SIDIS/Lambda_ABCONV/pythia8.306-1.0/18x275/hiDiv  ```
  * e+Au: BeAGLE v1.03.01
    * Each event contains at least one L<sub>c</sub> that decays through π+K+p channel
    * Q<sup>2</sup> > 1
    * Location:
      * 10x100: ``` epic_craterlake_without_zdc/SIDIS/Lc_ABCONV/HFsim-BeAGLE/BeAGLE1.03.01-1.0/eAu/10x100/q2_1to10000 ```
          
__Analysis macros__
* Jet reader: https://github.com/eic/snippets/tree/main/JetsAndHF/jetReaderExamples
* D<sup>0</sup> reconstruction based on Helix swimming: https://github.com/eic/snippets/tree/main/JetsAndHF/HF/D0_helix


__EICrecon Jet Reconstruction Documentation__

There are currently four jet collections in the default output of EICrecon:
* _GeneratedJets_, which are reconstructed from all final-state generator particles (particles from the ```GeneratedParticles``` collection) regardless of charge;
* _GeneratedChargedJets_, which are reconstructed from all charged final-state generator particles;
* _ReconstructedJets_, which are reconstructed from ```ReconstructedParticle``` objects (combinations of tracks and EMCal clusters produced by the MatchClusters algorithm);
* _ReconstructedChargedJets_, which are reconstructed from ```ReconstructedChargedParticle``` objects (i.e. tracks).

In all cases, the jets are formed via [FastJet3](https://fastjet.fr) according the parameters listed in the table below, and are stored as ```edm4eic::ReconstructedParticle``` objects. As this data type was intended to describe particles rather than extended objects like jets, additional information like the jet area currently is not stored.

| Parameter | Name | Value |
| --- | --- | --- |
| Jet algorithm | jetALgo | anti-kT |
| Jet recombination scheme | recomScheme | E-scheme |
| Jet resolution parameter | rJet | 1 |
| Exponent for generalized kT algorithms | pJet | -1 |
| Minimum constituent pT | mimCstPt | 0.2 GeV/c |
| Maximum constituent pT | maxCstPt | 100 GeV/c |
| Minimum jet pT | minJetPt | 1 GeV/c |
| Area type | areaType | active |
| Maximum ghost rapidity | ghostMaxRap | 3.5 |
| No. of repeated ghosts | numGhostRepeat | 1 |
| Area per ghost | ghostArea | 0.001 |

These parameters can be adjusted at runtime by the user, for example:
```
eicrecon \
  -Preco:ReconstructedChargedJets:jetAlgo=ee_genkt_algorithm \
  -Preco:ReconstructedChargedJets:rJet=0.8 \
  -Preco:ReconstructedChargedJets:pJet=-1.0 \
  <input edm4hep file>
```
