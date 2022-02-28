const AvlTree = require('../utils/AvlTree');

describe.skip('AVL Tree height 1', () => {
  it('Create and modify a tree', () => {
    const tree = new AvlTree();
    tree.set(0, 0);
    const firstTree = tree.toObject();
    expect(firstTree._id).toBe(0);
    expect(firstTree.left).toBe(null);
    expect(firstTree.right).toBe(null);
    tree.delete(0);
    const secondTree = tree.toObject();
    expect(secondTree).toBe(null);
    tree.set(0, 0);
    const thirdTree = tree.toObject();
    expect(thirdTree._id).toBe(0);
    expect(thirdTree.left).toBe(null);
    expect(thirdTree.right).toBe(null);
  });
});

describe.skip('AVL Tree height 2', () => {
  it('Create and modify a tree', () => {
    const nums = Array.from(Array(3).keys());
    const tree = new AvlTree();
    nums.forEach((num) => tree.set(num, num));
    const firstTree = tree.toObject();
    expect(firstTree._id).toBe(1);
    expect(firstTree.left._id).toBe(0);
    expect(firstTree.right._id).toBe(2);
    expect(firstTree.left.parent._id).toBe(1);
    expect(firstTree.right.parent._id).toBe(1);
    tree.delete(2);
    const secondTree = tree.toObject();
    expect(secondTree._id).toBe(1);
    expect(secondTree.left._id).toBe(0);
    expect(secondTree.right).toBe(null);
    expect(secondTree.left.parent._id).toBe(1);
    tree.set(2, 2);
    const thirdTree = tree.toObject();
    expect(thirdTree._id).toBe(1);
    expect(thirdTree.left._id).toBe(0);
    expect(thirdTree.right._id).toBe(2);
    expect(thirdTree.left.parent._id).toBe(1);
    expect(thirdTree.right.parent._id).toBe(1);
    tree.delete(2);
    tree.delete(0);
    const forthTree = tree.toObject();
    expect(forthTree._id).toBe(1);
    expect(forthTree.left).toBe(null);
    expect(forthTree.right).toBe(null);
    tree.set(2, 2);
    tree.set(0, 0);
    const fifthTree = tree.toObject();
    expect(fifthTree._id).toBe(1);
    expect(fifthTree.left._id).toBe(0);
    expect(fifthTree.right._id).toBe(2);
    expect(fifthTree.left.parent._id).toBe(1);
    expect(fifthTree.right.parent._id).toBe(1);
    tree.delete(1);
    const sixthTree = tree.toObject();
    expect(sixthTree._id).toBe(2);
    expect(sixthTree.left._id).toBe(0);
    expect(sixthTree.right).toBe(null);
    tree.set(1, 1);
    const seventhTree = tree.toObject();
    expect(seventhTree._id).toBe(1);
    expect(seventhTree.left._id).toBe(0);
    expect(seventhTree.right._id).toBe(2);
    expect(seventhTree.left.parent._id).toBe(1);
    expect(seventhTree.right.parent._id).toBe(1);
  });
});

describe.skip('AVL Tree height 3', () => {
  it('Create and modify a tree', () => {
    const nums = Array.from(Array(7).keys());
    const tree = new AvlTree();
    nums.forEach((num) => tree.set(num, num));
    const firstTree = tree.toObject();
    console.log(firstTree);
    expect(firstTree._id).toBe(3);
    expect(firstTree.left._id).toBe(1);
    expect(firstTree.right._id).toBe(5);
    expect(firstTree.right.left._id).toBe(4);
    expect(firstTree.right.right._id).toBe(6);
    expect(firstTree.right.left.parent._id).toBe(5);
    expect(firstTree.right.right.parent._id).toBe(5);
    expect(firstTree.left.parent._id).toBe(3);
    expect(firstTree.right.parent._id).toBe(3);
    expect(firstTree.left.left._id).toBe(0);
    expect(firstTree.left.right._id).toBe(2);
    expect(firstTree.left.left.parent._id).toBe(1);
    expect(firstTree.left.right.parent._id).toBe(1);
    tree.delete(5);
    const secondTree = tree.toObject();
    expect(secondTree._id).toBe(3);
    expect(secondTree.left._id).toBe(1);
    expect(secondTree.right._id).toBe(6);
    expect(secondTree.left.parent._id).toBe(3);
    expect(secondTree.right.parent._id).toBe(3);
    tree.set(5, 5);
    const thirdTree = tree.toObject();
    expect(thirdTree._id).toBe(3);
    expect(thirdTree.left._id).toBe(1);
    expect(thirdTree.right._id).toBe(5);
    expect(thirdTree.right.left._id).toBe(4);
    expect(thirdTree.right.right._id).toBe(6);
    expect(thirdTree.right.left.parent._id).toBe(5);
    expect(thirdTree.right.right.parent._id).toBe(5);
    expect(thirdTree.left.parent._id).toBe(3);
    expect(thirdTree.right.parent._id).toBe(3);
    expect(thirdTree.left.left._id).toBe(0);
    expect(thirdTree.left.right._id).toBe(2);
    expect(thirdTree.left.left.parent._id).toBe(1);
    expect(thirdTree.left.right.parent._id).toBe(1);
    tree.delete(3);
    tree.delete(0);
    const forthTree = tree.toObject();
    expect(forthTree._id).toBe(4);
    expect(forthTree.left.left).toBe(null);
  });
});

describe.skip('AVL Tree check', () => {
  it('Checks if value exist in tree', () => {
    const tree = new AvlTree();
    for (let i = 0; i < 10; i += 1) {
      tree.set(i, {
        userName: `user${i}`,
        firstName: `Jhon${i}`,
      });
    }
    const check1 = tree.check('userName', 'user99');
    const check2 = tree.check('userName', 'user2');
    const check3 = tree.check('firstName', 'Jhon3');
    const check4 = tree.check('lastName', 'Wick');
    expect(check1).toBe(false);
    expect(check2).toBe(true);
    expect(check3).toBe(true);
    expect(check4).toBe(false);
  });
});
