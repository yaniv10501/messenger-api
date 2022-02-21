const DoubledBlanacedNode = require('./DoubledBlanacedNode');

class AvlTree {
  constructor() {
    this.root = null;
  }

  set(_id, value) {
    if (!this.root) {
      this.root = new DoubledBlanacedNode({ _id, ...value });
    } else {
      this.root.add(_id, value);
    }
  }

  get(_id) {
    if (!this.root) {
      return null;
    }
    return this.root.find(_id);
  }

  getList(start, forbiddenList) {
    if (!this.root) {
      return null;
    }
    const queue = [];
    const list = [];
    queue.push(this.root);
    return this.breadthFirstTraverse(queue, list, start || 0, forbiddenList);
  }

  // eslint-disable-next-line class-methods-use-this
  breadthFirstTraverse(queue, array, start, forbiddenList) {
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
        const isForbidden = forbiddenList.some(
          (forbiddenItem) => forbiddenItem._id === node.value._id
        );
        if (isForbidden) {
          if (node.left) queue.push(node.left);
          if (node.right) queue.push(node.right);
        } else {
          array.push(node.value);
          if (node.left) queue.push(node.left);
          if (node.right) queue.push(node.right);
          i += 1;
          if (i >= start + 20) {
            queue.splice(0);
          }
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
