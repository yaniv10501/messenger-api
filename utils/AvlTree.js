const DoubledBlanacedNode = require('./DoubledBlanacedNode');

class AvlTree {
  constructor() {
    this.root = null;
    this.size = 0;
  }

  set(_id, value, options) {
    if (!this.root) {
      this.root = new DoubledBlanacedNode(_id, value);
      this.size = 1;
    } else {
      const modifiedSize = this.root.add(_id, value, options);
      if (modifiedSize) {
        this.size += 1;
      }
    }
  }

  get(_id, options) {
    if (!this.root) {
      return null;
    }
    return this.root.find(_id, options);
  }

  delete(_id) {
    if (!this.root) {
      return null;
    }
    if (!this.root.left && !this.root.right) {
      this.root = null;
      this.size = 0;
      return this;
    }
    const deletedNode = this.root.find(_id, { destruct: false });
    let currentNode = deletedNode;
    let searching = true;
    while (searching) {
      if (currentNode.right) {
        currentNode.value = currentNode.right.value;
        currentNode._id = currentNode.right._id;
        currentNode = currentNode.right;
      } else {
        currentNode.value = null;
        currentNode._id = null;
        searching = false;
      }
    }
    this.root.balance();
    this.size -= 1;
    return this;
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

  forEach(callback) {
    if (!this.root) {
      return null;
    }
    const queue = [];
    queue.push(this.root);
    return this.breadthFirstTraverse(queue, [], false, [], callback);
  }

  // eslint-disable-next-line class-methods-use-this
  breadthFirstTraverse(queue, array, start, forbiddenList, callback) {
    if (queue.length < 0) return array;

    let i = 0;
    while (queue.length > 0) {
      if (start && start > i) {
        const node = queue.shift();
        if (node.left) queue.push(node.left);
        if (node.right) queue.push(node.right);
        i += 1;
      } else {
        const node = queue.shift();
        const isForbidden = forbiddenList.some((forbiddenItem) => forbiddenItem._id === node._id);
        if (isForbidden) {
          if (node.left) queue.push(node.left);
          if (node.right) queue.push(node.right);
        } else {
          if (callback) {
            callback(node.value, node._id);
          }
          if (!callback) {
            array.push({ _id: node._id, ...node.value });
          }
          if (node.left) queue.push(node.left);
          if (node.right) queue.push(node.right);
          i += 1;
          if (start && i >= start + 20) {
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
