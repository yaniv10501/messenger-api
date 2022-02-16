const DoubledNode = require('./DoubledNode');

class BinaryTree {
  constructor() {
    this.root = null;
  }

  add(value) {
    const newNode = new DoubledNode(value);
    const node = newNode;
    if (this.root === null) {
      this.root = node;
    } else {
      let currentNode = this.root;
      let searching = true;
      while (searching) {
        if (currentNode.value > value) {
          if (!currentNode.left) {
            currentNode.left = newNode;
            searching = false;
          }
          currentNode = currentNode.left;
        } else {
          if (!currentNode.right) {
            currentNode.right = newNode;
            searching = false;
          }
          currentNode = currentNode.right;
        }
      }
    }
    return { newNode, tree: this };
  }

  toObject() {
    return this.root;
  }
}

module.exports = BinaryTree;
