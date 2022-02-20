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
    const queue = [];
    const list = [];
    queue.push(this.root);
    return this.breadthFirstTraverse(queue, list, start || 0);
  }

  // eslint-disable-next-line class-methods-use-this
  breadthFirstTraverse(queue, array, start) {
    if (queue.length < 0) return array;

    let i = 0;
    while (queue.length > 0) {
      if (start > i) {
        const node = queue.shift();
        if (node.left) queue.push(node.left);
        if (node.right) queue.push(node.right);
        i += 1;
      } else {
        const node = queue.shift();
        array.push(node.value);
        if (node.left) queue.push(node.left);
        if (node.right) queue.push(node.right);
        if (i >= start + 20) {
          queue.splice(0);
        }
      }
    }

    return array;
  }

  toJSON() {
    return JSON.stringify(this.root.serialize(), null, 4);
  }

  toObject() {
    return this.root.serialize();
  }
}

module.exports = AvlTree;
