import { h } from 'preact';
import Entries from '../entries';
import Icon from '../icon';
import ZeroState from '../zero-state';
import { fire } from '../unifire';

export default ({ filter, filterText, viewEntries = [], scrollPosition }) => {
  if(!viewEntries.length){
    if(!filter && !filterText){
      return (
        <ul class="search-suggestions fade-up dark-fill entry-text">
          <li onclick={fire('linkstate', { key: 'filter', val: 'favorites' })}>
            <Icon icon="star-filled"/>
            <span>Favorites</span>
          </li>
          <li onclick={fire('linkstate', { key: 'filterText', val: new Date().toISOString().slice(4, 10) })}>
            <Icon icon="calendar"/>
            <span>On this day</span>
          </li>
        </ul>
      );
    } else {
      return (
        <ZeroState/>
      );
    }
  }

  return (
    <Entries
      scrollPosition={scrollPosition}
      viewEntries={viewEntries}/>
  );
};
