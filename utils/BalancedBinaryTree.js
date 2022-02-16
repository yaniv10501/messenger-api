const DoubledBlanacedNode = require('./DoubledBlanacedNode');

class BalancedBinaryTree {
  add(value) {
    const newNode = new DoubledBlanacedNode(value);
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
    return { node: newNode, tree: this };
  }

  balance() {
    let currentNode = this.root;
  }
}

module.exports = BalancedBinaryTree;
