import { h } from 'preact';
import Entries from '../entries';
import Icon from '../icon';
import { fire } from '../unifire';

export default ({ filter, filterText, viewEntries = [], scrollPosition }) => {
  if(!viewEntries.length){
    if(!filter && !filterText){
      return (
        <ul class="menu fade-up dark-fill entry-text">
          <li onclick={() => fire('linkstate', { key: 'filter', val: 'favorites' })}>
            <Icon icon="star-filled"/>
            <span>Favorites</span>
          </li>
          <li onclick={() => fire('linkstate', { key: 'filterText', val: new Date().toISOString().slice(4, 10) })}>
            <Icon icon="calendar"/>
            <span>On this day</span>
          </li>
        </ul>
      );
    } else {
      return (
        <h2 class="center-text fade-up entry-text">It's empty in here!</h2>
      );
    }
  }

  return (
    <Entries
      scrollPosition={scrollPosition}
      viewEntries={viewEntries}
      filterText={filterText}/>
  );
};
