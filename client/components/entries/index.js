import { h } from 'preact';
import { memo } from 'preact/compat';
import { useEffect } from 'preact/hooks';
import ScrollViewport from 'preact-scroll-viewport';
import EntryPreview from '../entry-preview';
import ZeroState from '../zero-state';
import { fire, useUnifire } from '../unifire';
import debounce from '../../js/debounce';

const Entries = () => {
  const [ _, { viewEntries = [], scrollPosition, filterText  } ] = useUnifire('viewEntries', 'scrollPosition', 'filterText');

  useEffect(() => {
    document.body.onscroll = debounce(() => {
      fire('linkstate', { key: 'scrollPosition', val: document.body.scrollTop });
    }, 50);

    return () => document.body.onscroll = null;
  });

  if(!viewEntries.length){
    return <ZeroState/>
  }

  document.body.scrollTop = scrollPosition;
  return (
    <ScrollViewport class="entry-list fade-down" rowHeight={83} overscan={20}>
      {viewEntries.map(entry => <EntryPreview entry={entry} filterText={filterText}/>)}
    </ScrollViewport>
  );
}

export default memo(Entries);
