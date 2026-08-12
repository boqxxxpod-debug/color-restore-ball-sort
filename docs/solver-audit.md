# Solver / level audit

## Rule ownership

The browser's `CRGame` is the single rule owner. A move transfers exactly one top ball; the target must be empty or have the same top color and must have capacity. Clear, immediate STUCK, Hint candidate generation, certificate replay, and the analyzer all call this API. The asynchronous UI solvability search is sliced and capped; only the offline analyzer performs whole-level traversal.

## Method and results

`tools/level-analyzer.js` loads the production scripts in a Node VM. For each level it:

1. replays the stored certificate, checking legality and conservation of balls at every move;
2. breadth-first traverses canonical states (tube positions are semantically interchangeable);
3. records the exact shortest distance when traversal exhausts the reachable graph;
4. measures UI-visible branching along the certificate and across the graph, forced-choice ratio, alternative choices, empty-workspace use, completed-tube disruption, and terminal dead ends;
5. computes the documented relative Difficulty Score.

At the 5,000-state cap all 30 graphs exhaust (16,708 total normalized states), so all shortest distances and dead-end counts in the generated report are exact for the production rule. All 30 initial boards are uncleared and all 30 certificates replay to clear. The largest graphs are Levels 12 (3,275), 11 (2,839), and 13 (1,391); no approximation was needed in this release.

## Difficulty review

The major structural steps are two buffers to one at Level 14, then six to seven colors at Level 21, and eight colors at Level 26. Exact shortest paths range from 7–15 in Garden, 16–35 in Ocean, and 25–37 in City. Level 30 is tied for the highest exact minimum (37) and highest score (69.8), rather than exceeding the other template peers.

The audit flags local dips at Levels 4, 7–9, 13–14, 18–20, 22, 24, 26, and 28. Levels 14/20, 26/28, and 27/29/30 also have identical graph-size/shortest/score profiles, indicating repeated structural templates despite different colors. These are level-content concerns, not solver defects. No stage data was changed in this pass: replacing a solved board solely to force a monotonic scalar score would be riskier than retaining the now-proven certificates without play-testing. The report makes these candidates explicit for a subsequent content-design pass.

## Score and limitations

The score is comparative, not a claim about player psychology. It combines exact shortest length, colors, certified-route branching and alternatives, empty-tube use, and one-buffer pressure; forced play and breaking completed tubes reduce it. Terminal dead-end counts are exact here, but are not the same as a uniformly sampled human “stuck rate.” Cycles are eliminated with production `stateKey`; color-renaming symmetry is not collapsed, because a state never changes color identities and tube normalization already makes every current graph inexpensive.

Hint remains a lightweight two-ply heuristic and STUCK first uses the immediate legal-move check plus the existing yielded/capped solvability search. Neither runs the offline 30-level analyzer, preserving mobile responsiveness.
