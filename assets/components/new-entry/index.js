import { h, Component } from 'preact';
import { route } from 'preact-router';
import fire from '../../js/fire';

export default class Entry extends Component {
  componentWillMount = () => {
    if(!this.props.loggedIn) return route('/');
  };

  getDate() {
    return new Date().toISOString().slice(0, 10);
  }

  upsert = e => {
    e.preventDefault();
    fire('create', {entry: {date: this.getDate(), text: 'programmatically', isPublic: false}})();
  }

  render({ entryIndex, entry }) {
    return (
      <new-entry>
        <form method="post" action="/api/entry" onsubmit={this.upsert} class="pure-form pure-form-stacked">
          <fieldset>
            <input name="date" value={this.getDate()} class="needsclick"/>
            <textarea name="text" class="entry-text needsclick"></textarea>
            Is Public: <input type="checkbox" name="isPublic" checked="{opts.entry.isPublic}"/>
            <div class="entry-actions">
              <a href="/entries" onclick="{back}" class="pure-button button-round entry-action--left">Cancel</a>
              <input type="submit" class="pure-button pure-button-primary button-round entry-action--right"/>
            </div>
          </fieldset>
        </form>
      </new-entry>
    );
  }
}
