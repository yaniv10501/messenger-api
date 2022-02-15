class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  _find(index) {
    if (index > this.length) return null;
    let current = this.head;
    for (let i = 0; i < index; i += 1) {
      current = current.next;
    }
    return current;
  }

  get(index) {
    const { value } = this._find(index) || { value: null };
    return value;
  }

  delete(index) {
    if (index === 0) {
      const { head } = this;
      if (head) {
        this.head = head.next;
      } else {
        this.head = null;
        this.tail = null;
      }
      this.length -= 1;
      return head;
    }
    const node = this._find(index - 1);
    const deletedNode = node.next;
    if (!deletedNode) return null;
    delete node.next;
    node.next = deletedNode.next;
    if (!node.next) this.tail = node.next;
    this.length -= 1;
    return deletedNode.value;
  }

  push(value) {
    const node = new Node(value);
    if (!this.head) {
      this.head = node;
    } else {
      this.tail.next = node;
    }
    this.tail = node;
    this.length += 1;
  }

  unshift(value) {
    const node = new Node(value);
    if (!this.tail) {
      this.tail = node;
    } else {
      node.next = this.head;
    }
    this.head = node;
    this.length += 1;
  }

  pop() {
    return this.delete(this.length - 1);
  }

  getArray() {
    const array = [];
    let current = this.tail;
    for (let i = 0; i < this.length; i += 1) {
      array.push(current);
      current = current.next;
    }
    return array;
  }
}

module.exports = LinkedList;
