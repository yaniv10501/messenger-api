const DoubledBlanacedNode = require('./DoubledBlanacedNode');

class AvlTree {
  constructor() {
    this.root = null;
  }

  set(value) {
    if (!this.root) {
      this.root = new DoubledBlanacedNode(value);
    } else {
      this.root.add(value);
    }
  }

  get(_id) {
    if (!this.root) {
      return null;
    }
    return this.root.find(_id);
  }

  getList(start) {
    if (!this.root) {
      return null;
    }
    if (start instanceof Number) {
      return this.root.getList(start);
    }
    if (start instanceof Object && (start.left || start.right)) {
      return start.getList(0);
    }
    throw new Error(
      'Start is not defined properly, please specify either the start Number or start node'
    );
  }

  toJSON() {
    return JSON.stringify(this.root.serialize(), null, 4);
  }

  toObject() {
    return this.root.serialize();
  }
}

module.exports = AvlTree;
