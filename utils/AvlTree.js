const { isFunction } = require('lodash');
const DoubledBlanacedNode = require('./DoubledBlanacedNode');

class AvlTree {
  constructor() {
    this.root = null;
    this.size = 0;
  }

  set(_id, value, options) {
    if (!this.root) {
      this.root = new DoubledBlanacedNode(_id, value, null);
      this.size = 1;
    } else {
      let modifiedSize;
      let searching = true;
      let ascending = true;
      let currentNode = this.root;
      const { isNew = true } = options || {};
      while (searching) {
        if (currentNode._id === _id) {
          if (isNew) {
            currentNode.value = value;
          } else if (isFunction(value)) {
            currentNode.value = value(currentNode.value, currentNode._id);
          } else {
            currentNode.value = {
              ...currentNode.value,
              ...value,
            };
          }
          searching = false;
          ascending = false;
        }
        if (currentNode._id > _id) {
          if (currentNode.left) {
            currentNode = currentNode.left;
          } else {
            currentNode.left = new DoubledBlanacedNode(_id, value, currentNode);
            modifiedSize = true;
            searching = false;
          }
        }
        if (currentNode._id < _id) {
          if (currentNode.right) {
            currentNode = currentNode.right;
          } else {
            currentNode.right = new DoubledBlanacedNode(_id, value, currentNode);
            modifiedSize = true;
            searching = false;
          }
        }
      }
      while (ascending) {
        const rightHeight = currentNode.right ? currentNode.right.height : 0;
        const leftHeight = currentNode.left ? currentNode.left.height : 0;
        if (!currentNode.left || rightHeight > leftHeight) {
          currentNode.height = rightHeight + 1;
        }
        if (!currentNode.right || rightHeight < leftHeight) {
          currentNode.height = leftHeight + 1;
        }
        currentNode.balance();
        if (currentNode.parent) {
          currentNode = currentNode.parent;
        } else {
          ascending = false;
        }
      }
      if (modifiedSize) {
        currentNode.balance();
        this.size += 1;
      }
    }
  }

  get(_id, options) {
    if (!this.root) {
      return null;
    }
    let searching = true;
    let currentNode = this.root;
    const { destruct = true, find = false } = options || {};
    while (searching) {
      if (currentNode._id === _id) {
        searching = false;
      } else if (currentNode._id > _id) {
        if (currentNode.left) {
          currentNode = currentNode.left;
        } else {
          return null;
        }
      } else if (currentNode._id < _id) {
        if (currentNode.right) {
          currentNode = currentNode.right;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }
    if (find) {
      return currentNode;
    }
    if (destruct) {
      return { _id: currentNode._id, ...currentNode.value };
    }
    return currentNode.value;
  }

  delete(_id) {
    if (!this.root) {
      return null;
    }
    const deletedNode = this.get(_id, { destruct: false, find: true });
    if (!deletedNode) {
      return null;
    }
    if (deletedNode.height === 1) {
      console.log(1);
      let currentNode = deletedNode.parent;
      let ascending;
      deletedNode.value = null;
      deletedNode._id = null;
      deletedNode.parent = null;
      deletedNode.height = 0;
      if (!currentNode) {
        ascending = false;
        this.root = null;
      } else if (currentNode.left && currentNode.left._id === null) {
        currentNode.left = null;
      } else {
        currentNode.right = null;
      }
      while (ascending) {
        const rightHeight = currentNode.right ? currentNode.right.height : 0;
        const leftHeight = currentNode.left ? currentNode.left.height : 0;
        if (!currentNode.left || rightHeight > leftHeight) {
          currentNode.height = rightHeight + 1;
        }
        if (!currentNode.right || rightHeight < leftHeight) {
          currentNode.height = leftHeight + 1;
        }
        currentNode.balance();
        if (currentNode.parent) {
          currentNode = currentNode.parent;
        } else {
          ascending = false;
        }
      }
    }
    if (deletedNode.height === 2) {
      console.log(2);
      let currentNode = deletedNode;
      let ascending;
      if (deletedNode.right) {
        deletedNode.value = deletedNode.right.value;
        deletedNode._id = deletedNode.right._id;
        deletedNode.right.value = null;
        deletedNode.right._id = null;
        deletedNode.right.parent = null;
        deletedNode.right.height = 0;
        deletedNode.right = null;
      } else {
        deletedNode.value = deletedNode.left.value;
        deletedNode._id = deletedNode.left._id;
        deletedNode.left.value = null;
        deletedNode.left._id = null;
        deletedNode.left.parent = null;
        deletedNode.left.height = 0;
        deletedNode.left = null;
      }
      while (ascending) {
        const rightHeight = currentNode.right ? currentNode.right.height : 0;
        const leftHeight = currentNode.left ? currentNode.left.height : 0;
        if (!currentNode.left || rightHeight > leftHeight) {
          currentNode.height = rightHeight + 1;
        }
        if (!currentNode.right || rightHeight < leftHeight) {
          currentNode.height = leftHeight + 1;
        }
        currentNode.balance();
        if (currentNode.parent) {
          currentNode = currentNode.parent;
        } else {
          ascending = false;
        }
      }
    }
    if (deletedNode.height > 2) {
      console.log(3);
      if (deletedNode.right) {
        let currentNode = deletedNode.right;
        let searching = true;
        let ascending = true;
        while (searching) {
          if (currentNode.left) {
            currentNode = currentNode.left;
          } else {
            deletedNode.value = currentNode.value;
            deletedNode._id = currentNode._id;
            currentNode = currentNode.parent;
            currentNode.left.value = null;
            currentNode.left._id = null;
            currentNode.left.parent = null;
            currentNode.left.height = 0;
            currentNode.left = null;
            searching = false;
          }
        }
        while (ascending) {
          const rightHeight = currentNode.right ? currentNode.right.height : 0;
          const leftHeight = currentNode.left ? currentNode.left.height : 0;
          if (!currentNode.left || rightHeight > leftHeight) {
            currentNode.height = rightHeight + 1;
          }
          if (!currentNode.right || rightHeight < leftHeight) {
            currentNode.height = leftHeight + 1;
          }
          currentNode.balance();
          if (currentNode.parent) {
            currentNode = currentNode.parent;
          } else {
            ascending = false;
          }
        }
      } else {
        let currentNode = deletedNode.left;
        let searching = true;
        let ascending = true;
        while (searching) {
          if (currentNode.right) {
            currentNode = currentNode.right;
          } else {
            deletedNode.value = currentNode.value;
            deletedNode._id = currentNode._id;
            currentNode = currentNode.parent;
            currentNode.right.value = null;
            currentNode.right._id = null;
            currentNode.right.parent = null;
            currentNode.right.height = 0;
            currentNode.right = null;
            searching = false;
          }
        }
        while (ascending) {
          const rightHeight = currentNode.right ? currentNode.right.height : 0;
          const leftHeight = currentNode.left ? currentNode.left.height : 0;
          if (!currentNode.left || rightHeight > leftHeight) {
            currentNode.height = rightHeight + 1;
          }
          if (!currentNode.right || rightHeight < leftHeight) {
            currentNode.height = leftHeight + 1;
          }
          currentNode.balance();
          if (currentNode.parent) {
            currentNode = currentNode.parent;
          } else {
            ascending = false;
          }
        }
      }
    }
    this.size -= 1;
    return this;
  }

  check(property, value) {
    if (!this.root) {
      return null;
    }
    const queue = [this.root];
    const result = this.breadthFirstTraverse(queue, [], false, [], null, {
      check: true,
      property,
      value,
    });
    return result;
  }

  getList(start, forbiddenList) {
    if (!this.root) {
      return [];
    }
    const queue = [];
    const list = [];
    queue.push(this.root);
    return this.breadthFirstTraverse(queue, list, start || 0, forbiddenList);
  }

  findList(_id, query) {
    if (!this.root) {
      return null;
    }
    const queue = [];
    const list = [];
    queue.push(this.root);
    return this.breadthFirstTraverse(queue, list, false, [{ _id }], null, { find: true, query });
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
  breadthFirstTraverse(queue, array, start, forbiddenList, callback, options) {
    if (queue.length < 0) return array;

    const {
      check = false,
      property = null,
      value = null,
      find = false,
      query = null,
    } = options || {};
    let i = 0;
    let result;
    while (queue.length > 0) {
      if (start && start > i) {
        const node = queue.shift();
        if (node.left) queue.push(node.left);
        if (node.right) queue.push(node.right);
        i += 1;
      } else {
        const node = queue.shift();
        if (check) {
          // console.log(property, value, node.value[property]);
          if (node.left) queue.push(node.left);
          if (node.right) queue.push(node.right);
          if (node.value[property] === value) {
            queue.splice(0);
            result = true;
          }
        } else {
          const isForbidden = forbiddenList.some((forbiddenItem) => forbiddenItem._id === node._id);
          if (isForbidden) {
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
          } else {
            if (callback) {
              callback(node.value, node._id);
            }
            if (!callback) {
              if (find) {
                const {
                  value: { userName, firstName, lastName },
                } = node;
                if (userName === query) {
                  array.unshift({ _id: node._id, ...node.value });
                } else if (
                  userName.includes(query) ||
                  firstName.includes(query) ||
                  lastName.includes(query)
                ) {
                  array.push({ _id: node._id, ...node.value });
                }
              } else {
                array.push({ _id: node._id, ...node.value });
              }
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
    }
    if (check) {
      return result || false;
    }

    return array;
  }

  toJSON() {
    return JSON.stringify(this.root.serialize(), null, 4);
  }

  toObject() {
    if (!this.root) {
      return null;
    }
    return this.root.serialize(this.size);
  }
}

module.exports = AvlTree;
