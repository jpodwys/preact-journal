import { h } from '../../packages/kyvo/core';
import { app, viewEntries } from '../../js/app-state';
import ScrollViewport from '../virtual-scroll';
import EntryPreview from '../entry-preview';

const renderer = (filterText, fresh) => items =>
  items.map(entry => <EntryPreview entry={entry} filterText={filterText} fresh={fresh.includes(entry.id)}/>);

export default () => {
  const { filterText, fresh } = app, entries = viewEntries();
  if(!entries.length){
    return <h2 class="center-text fade-up entry-text">It's empty in here!</h2>
  }

  return (
    <ScrollViewport
      items={entries}
      renderer={renderer(filterText, fresh)}
      rowHeight={83}>
    </ScrollViewport>
  );
}
