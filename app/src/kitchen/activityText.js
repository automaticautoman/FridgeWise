// Turns activity entries (F13) into words, shared by the feed and the toast.
export const KIND_STYLE = {
  added: { badge: 'Added', bg: '#D6F0DC', fg: '#1F5E37' },
  edited: { badge: 'Edited', bg: '#E3F3FB', fg: '#1D5470' },
  used: { badge: 'Used up', bg: '#FFF3C4', fg: '#5C4300' },
  removed: { badge: 'Removed', bg: '#FFE3E1', fg: '#8E2C26' },
  people: { badge: 'People', bg: '#EDE6FB', fg: '#4B3A80' }
};

export function describe(e, uid) {
  const who = e.actorId === uid ? 'You' : (e.actorName || 'Someone').split(' ')[0];
  const target = e.targetId === uid ? 'you' : e.targetName || 'a member';
  // "Eggs, 12" / "Milk, 500 ml" like the Activity mockup.
  const item = e.itemName ? (e.quantity ? `${e.itemName}, ${e.quantity}` : e.itemName) : 'an item';
  switch (e.type) {
    case 'kitchen-created': return { who, verb: 'created the kitchen', kind: 'people' };
    case 'member-joined': return { who, verb: 'joined the kitchen', kind: 'people' };
    case 'member-left': return { who, verb: 'left the kitchen', kind: 'people' };
    case 'member-removed': return { who, verb: 'removed', item: target, kind: 'people' };
    case 'owner-changed': return { who, verb: 'handed the kitchen over to', item: target, kind: 'people' };
    case 'item-added': return { who, verb: 'added', item, where: e.location, kind: 'added' };
    case 'item-edited': return { who, verb: 'changed', item, where: e.location, kind: 'edited' };
    case 'item-consumed': return { who, verb: 'used up', item, where: e.location, kind: 'used' };
    case 'item-wasted': return { who, verb: 'threw out', item, where: e.location, kind: 'removed' };
    case 'item-removed': return { who, verb: 'removed', item, where: e.location, kind: 'removed' };
    case 'item-restored': return { who, verb: 'brought back', item, where: e.location, kind: 'added' };
    default: return { who, verb: 'updated the kitchen', kind: 'edited' };
  }
}
