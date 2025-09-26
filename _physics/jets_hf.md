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
      * Location: ``` epic_craterlake/SIDIS/D0_ABCONV/pythia8.306-1.0/18x275/hiDiv  ```
    * 10x100
      * Each event contains at least one D<sup>0</sup> that decays into π+K pair, and the decay daughters are within pseudorapidity of &plusmn;3.5
      * Location:
        * Q<sup>2</sup> > 1: ``` epic_craterlake/SIDIS/D0_ABCONV/pythia8.306-1.1/10x100/q2_1/hiDiv  ```
        * Q<sup>2</sup> > 100: ``` epic_craterlake/SIDIS/D0_ABCONV/pythia8.306-1.1/10x100/q2_100/hiDiv  ```
    * 5x41
      * Each event contains at least one D<sup>0</sup> that can decays into π+K pair
      * Location: ``` epic_craterlake/SIDIS/D0_ABCONV/HFsim-PYTHIA/pythia8.306-1.2/ep/5x41/q2_1to10000/hiDiv  ```
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
      * Location: ``` epic_craterlake/SIDIS/Lambda_ABCONV/pythia8.306-1.0/18x275/hiDiv  ```
    * 10x100
      * Each event contains at least one L<sub>c</sub> that decays to a π+K+p channel
      * Location: ``` epic_craterlake/SIDIS/Lc_ABCONV/HFsim-PYTHIA/pythia8.306-1.2/ep/10x100/q2_1to10000/hiDiv  ```
  * e+Au: BeAGLE v1.03.01
    * Each event contains at least one L<sub>c</sub> that decays through π+K+p channel
    * Q<sup>2</sup> > 1
    * Location:
      * 10x100: ``` epic_craterlake_without_zdc/SIDIS/Lc_ABCONV/HFsim-BeAGLE/BeAGLE1.03.01-1.0/eAu/10x100/q2_1to10000 ```
          
__Analysis macros__
* Jet reader: https://github.com/eic/snippets/tree/main/JetsAndHF/jetReaderExamples
* D<sup>0</sup> reconstruction based on Helix swimming: https://github.com/eic/snippets/tree/main/JetsAndHF/HF/D0_helix


__EICrecon Jet Reconstruction Documentation__

There are currently six jet collections in the default output of EICrecon:
* _GeneratedJets_, which are reconstructed using charged and neutral particles from the ```GeneratedParticles``` collection(final-state primaries) using the anti-kT algorithm with R = 1.0;
* _GeneratedChargedJets_, which are reconstructed using charged particles from the ```GeneratedParticles``` collection using the anti-kT algorithm with R = 1.0;
* _GeneratedCentauroJets_, which are reconstructed using charged and neutral particles from the ```GeneratedParticles``` collection using the Centauro algorithm with R = 0.8;
* _ReconstructedJets_, which are reconstructed using charged and neutral particles (tracks and EMCal clusters) from the ```ReconstructedParticles``` collection using the anti-kT algorithm with R = 1.0;
* _ReconstructedChargedJets_, which are reconstructed using charged particles (tracks) from the ```ReconstructedChargedParticles``` collection using the anti-kT algorithm with R = 1.0;
* _ReconstructedCentauroJets_, which are reconstructed using charged and neutral particles from the ```ReconstructedParticles``` collection using the Centauro algorithm with R = 0.8;


Jet reconstruction is handled by [FastJet3](https://fastjet.fr). User-configurable parameters and their default values are listed in the table below. Jets are stored as ```edm4eic::ReconstructedParticle``` objects, and since this data type was intended to describe particles rather than jets, additional information like the jet area currently is not stored..

| Parameter | Name | Default Value |
| --- | --- | --- |
| Jet algorithm | jetAlgo | anti-kT |
| Jet recombination scheme | recombScheme | E-scheme |
| Jet resolution parameter | rJet | 1 |
| Exponent for generalized kT algorithms | pJet | -1 |
| Minimum constituent pT | minCstPt | 0.2 GeV/c |
| Maximum constituent pT | maxCstPt | 100 GeV/c |
| Minimum jet pT | minJetPt | 1 GeV/c |
| Area type | areaType | active |
| Maximum ghost rapidity | ghostMaxRap | 3.5 |
| No. of repeated ghosts | numGhostRepeat | 1 |
| Area per ghost | ghostArea | 0.01 |
| Contributed jet algorithm | jetContribAlgo | Centauro |

These parameters can be adjusted at runtime, illustrated by the code snippet below. To use a contributed fastjet algorithm, the user should set ```jetAlgo``` to ```plugin_algorithm```.
```
eicrecon \
  -Preco:ReconstructedChargedJets:jetAlgo=ee_genkt_algorithm \
  -Preco:ReconstructedChargedJets:rJet=0.8 \
  -Preco:ReconstructedChargedJets:pJet=-1.0 \
  <input edm4hep file>
```
