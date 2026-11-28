import { h } from '../../packages/kyvo/core';
import { app, viewEntries } from '../../js/app-state';
import Entries from '../entries';
import Icon from '../icon';

export default () => {
  const { filter, filterText } = app;
  if(!viewEntries().length){
    if(!filter && !filterText){
      return (
        <ul class="menu fade-up dark-fill entry-text">
          <li onclick={() => { app.filter = 'favorites'; }}>
            <Icon icon="star-filled"/>
            <span>Favorites</span>
          </li>
          <li onclick={() => { app.filterText = new Date().toLocaleDateString('en-CA').slice(5); }}>
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

  return <Entries />;
};
