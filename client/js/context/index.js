import { fire } from '../../components/unifire';

const getEntryId = function(target){
  while(target && !target.getAttribute('data-id')){
    target = target.parentNode;
  }
  return target.getAttribute('data-id');
};

export default function(e) {
  if(!e || !e.target) return;
  e.preventDefault();
  const id = getEntryId(e.target);
  fire('setEntry', { id })();
}
