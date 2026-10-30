import test from "node:test";
import assert from "node:assert/strict";
import { computeLives } from "./lives.ts";

test("a player with no losses has full lives", () => {
  assert.deepEqual(computeLives([], 3, 5), { lost: 0, livesLeft: 3, eliminatedGW: null, lostThisGW: false });
});

test("losses are counted up to and including the gameweek asked about", () => {
  assert.deepEqual(computeLives([2, 4], 3, 3), { lost: 1, livesLeft: 2, eliminatedGW: null, lostThisGW: false });
  assert.deepEqual(computeLives([2, 4], 3, 4), { lost: 2, livesLeft: 1, eliminatedGW: null, lostThisGW: true });
});

test("the third loss eliminates, and eliminatedGW is the gameweek of that loss", () => {
  const status = computeLives([7, 2, 5], 3, 9);
  assert.equal(status.livesLeft, 0);
  assert.equal(status.eliminatedGW, 7);
  assert.equal(status.lost, 3);
});

test("looking back before the final loss shows the player still in", () => {
  const status = computeLives([2, 5, 7], 3, 6);
  assert.equal(status.livesLeft, 1);
  assert.equal(status.eliminatedGW, null);
});

test("the gameweek of the final loss shows lostThisGW and eliminated together", () => {
  const status = computeLives([2, 5, 7], 3, 7);
  assert.equal(status.eliminatedGW, 7);
  assert.equal(status.lostThisGW, true);
});

test("with one life it behaves like a straight knockout", () => {
  assert.deepEqual(computeLives([4], 1, 4), { lost: 1, livesLeft: 0, eliminatedGW: 4, lostThisGW: true });
  assert.equal(computeLives([4], 1, 3).eliminatedGW, null);
});
