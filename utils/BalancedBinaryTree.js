const DoubledBlanacedNode = require('./DoubledBlanacedNode');

class BalancedBinaryTree {
  constructor() {
    this.root = null;
  }

  add(value) {
    if (!this.root) {
      this.root = new DoubledBlanacedNode(value);
    } else {
      this.root.add(value);
    }
  }

  toJSON() {
    return JSON.stringify(this.root.serialize(), null, 4);
  }

  toObject() {
    return this.root.serialize();
  }
}

module.exports = BalancedBinaryTree;
