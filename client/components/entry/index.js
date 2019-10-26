import { h } from 'preact';
import { memo } from 'preact/compat';
import { useEffect } from 'preact/hooks';
import Icon from '../icon';
import { fire, useUnifire } from '../unifire';
import FourOhFour from '../four-oh-four';
import debounce from '../../js/debounce';

const slowUpsert = (e, entry) => {
  if(entry.newEntry){
    entry.date = document.getElementById('entryDate').innerText;
    entry.text = document.getElementById('entryText').innerText;
    fire('createEntry', { entry });
  } else {
    update(e, entry);
  }
}

const upsert = debounce(slowUpsert, 500);

const update = (e, entry) => {
  var property;
  switch(e.target.id){
    case 'entryDate':  property = 'date'; break;
    case 'entryText':  property = 'text'; break;
  }
  var obj = {
    entry: {},
    property: property,
    entryId: entry.id
  }
  obj.entry[property] = e.target.innerText.trim();
  fire('updateEntry', obj);
}

const shouldUpdate = (prev, next) => {
  var oe = prev.entry;
  var ne = next.entry;
  if(!oe || !ne) return true;
  if(oe.id !== ne.id) return true;
  return false;
}

const Entry = () => {
  const [{ view, entry, viewEntries, entryIndex  }] = useUnifire([ 'view', 'entry', 'viewEntries', 'entryIndex' ], shouldUpdate);

  useEffect(() => {
    if(view === '/new'){
      const entryText = document.getElementById('entryText');
      if(entryText) entryText.focus();
    }
  });

  if(!entry) return <FourOhFour/>
  return (
    <div class="entry fade-up">
      <div class="entry-header nav-set dark-fill">
        {view !== '/new' &&
          <Icon
            icon="left"
            key={entry.id + '-left'}
            onclick={() => fire('shiftEntry', -1)}
            class={entryIndex > 0 ? 'dark-fill' : 'hidden'}/>
        }
        <div class="entry-date-wrapper">
          <h1
            id="entryDate"
            contenteditable
            onInput={(e) => upsert(e, entry)}
            class="entry-date center-text">
            {entry.date}
          </h1>
        </div>
        {view !== '/new' &&
          <Icon
            icon="left"
            key={entry.id + '-right'}
            onclick={() => fire('shiftEntry', 1)}
            class={entryIndex < (viewEntries.length - 1) ? 'dark-fill next-entry' : 'hidden'}/>
        }
      </div>
      <div
        id="entryText"
        contenteditable
        class="entry-text"
        onInput={(e) => upsert(e, entry)}
        key={'entry-' + entry.id}>
        {entry.text}
      </div>
    </div>
  );
}

export default memo(Entry);
