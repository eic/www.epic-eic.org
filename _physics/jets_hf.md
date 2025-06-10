---
title: Jets and Heavy Flavor
description: Jets and Heavy Flavor
name: jets_hf
layout: default
---

{% include layouts/wg_top.md %}

__Simulations__
* Repository for event generation: https://github.com/eic/HFsim
* D<sup>0</sup> samples
  * e+p
    * 18x275
      * Each event contains at least one D<sup>0</sup>
      * Location: ``` SIDIS/D0_ABCONV/pythia8.306-1.0/18x275/hiDiv  ```
    * 10x100
      * Each event contains at least one D<sup>0</sup> that decays into π+K pair, and the decay daughters are within |eta| < 3.5
      * Location:
        * Q<sup>2</sup> > 1: ``` SIDIS/D0_ABCONV/pythia8.306-1.1/10x100/q2_1/hiDiv  ```
        * Q<sup>2</sup> > 100: ``` SIDIS/D0_ABCONV/pythia8.306-1.1/10x100/q2_100/hiDiv  ```
  * e+Au
    * 10x100
      * Simulated with BeAGLE v1.03.01
      * Each event contains at least one D<sup>0</sup> that decays into π+K pair
      * Location: [Simulation request submitted]
    * 5x41
      * Simulated with BeAGLE v1.03.01
      * Each event contains at least one D<sup>0</sup> that decays into π+K pair
      * Location: [Simulation request submitted]
* L<sub>c</sub> samples
  * e+p
    * 18x275
      * Each event contains at least one L<sub>c</sub>
      * Location: ``` SIDIS/Lambda_ABCONV/pythia8.306-1.0/18x275/hiDiv  ```
     
__Analysis macros__
* Jet reader: https://github.com/eic/snippets/tree/main/JetsAndHF/jetReaderExamples
* D<sup>0</sup> reconstruction based on Helix swimming: https://github.com/eic/snippets/tree/main/JetsAndHF/HF/D0_helix
