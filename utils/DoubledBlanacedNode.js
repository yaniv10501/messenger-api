const DoubledNode = require('./DoubledNode');

class DoubledBlanacedNode extends DoubledNode {
  constructor(_id, value, parent) {
    super(value);
    this._id = _id;
    this.height = 1;
    this.parent = parent;
  }

  /**
   * @method find - Find a value by the id of the node.
   * @param {String} _id - The id of the node to be found.
   * @param {Boolean} options.destruct - Should the value be destructed for return, defualt to true.
   * @returns The found value
   */

  balance() {
    const rightHeight = this.right ? this.right.height : 0;
    const leftHeight = this.left ? this.left.height : 0;

    if (leftHeight > rightHeight + 1) {
      const leftRightHeight = this.left.right ? this.left.right.height : 0;
      const leftLeftHeight = this.left.left ? this.left.left.height : 0;

      if (leftRightHeight > leftLeftHeight) {
        this.left.rotateRR();
      }

      this.rotateLL();
    } else if (rightHeight > leftHeight + 1) {
      const rightRightHeight = this.right.right ? this.right.right.height : 0;
      const rightLeftHeight = this.right.left ? this.right.left.height : 0;

      if (rightLeftHeight > rightRightHeight) {
        this.right.rotateLL();
      }

      this.rotateRR();
    }
  }

  rotateRR() {
    const valueBefore = { _id: this._id, value: this.value };
    const leftBefore = this.left;
    this._id = this.right._id;
    this.value = this.right.value;
    this.left = this.right;
    this.right = this.right.right;
    this.left.right = this.left.left;
    this.left.left = leftBefore;
    this.left.value = valueBefore.value;
    this.left._id = valueBefore._id;
    this.left.updateInNewLocation();
    this.updateInNewLocation();
  }

  rotateLL() {
    const valueBefore = { _id: this._id, value: this.value };
    const rightBefore = this.right;
    this._id = this.left._id;
    this.value = this.left.value;
    this.right = this.left;
    this.left = this.left.left;
    this.right.left = this.right.right;
    this.right.right = rightBefore;
    this.right.value = valueBefore.value;
    this.right._id = valueBefore._id;
    this.right.updateInNewLocation();
    this.updateInNewLocation();
  }

  updateInNewLocation() {
    if (!this.right && !this.left) {
      this.height = 1;
    } else if (!this.right || (this.left && this.right.height < this.left.height)) {
      this.height = this.left.height + 1;
    } else {
      this.height = this.right.height + 1;
    }
  }

  serialize() {
    const ans = { _id: this._id, value: this.value };
    ans.left = this.left === null ? null : this.left.serialize();
    ans.right = this.right === null ? null : this.right.serialize();
    ans.height = this.height;
    return ans;
  }
}

module.exports = DoubledBlanacedNode;
