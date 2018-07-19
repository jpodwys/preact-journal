import { h, Component } from 'preact';
import Icon from '../icon';
import fire from '../../js/fire';
import copyText from '../../js/copy-text';
import debounce from '../../js/debounce';

export default class Header extends Component {
	clearFilterText = () => {
		this.base.querySelector('#filterTextInput').focus();
		fire('filterByText', '')();
	}

	showFilterText = () => {
		fire('linkstate', {key: 'showFilterInput', val: true, cb: function(){
			this.base.querySelector('#filterTextInput').focus();
		}})();
	}

	cancelAndBlur = (e) => {
		e.preventDefault();
		this.base.querySelector('#filterTextInput').blur();
	}

	copy = () => {
		let date = document.getElementById('entryDate').innerText;
		let text = document.getElementById('entryText').innerText;
		copyText(date + ' ' + text);
	}

	render({view, loggedIn, viewEntries, entry, filterText, showFilterInput, dark}) {
		if(!loggedIn) return null;
		let vw = window.innerWidth;
		let entryCount = Array.isArray(viewEntries) ? viewEntries.length : 0;
		return (
			<header class="elevated">
				<span class="nav-set">
					{view === '/entries' && (vw > 400 || !showFilterInput) &&
						<h3 class="fly">{entryCount} Entries</h3>
					}

					{(view === '/entry' || view === '/new') &&
						<a href="/entries">
							<Icon icon="back" key="header-back" class="reveal"/>
						</a>
					}
				</span>

				<span class="nav-set grow">
					{view === '/entries' && showFilterInput &&
						<form class="search-form full-height right" onsubmit={this.cancelAndBlur}>
					    <input
					    	id="filterTextInput"
					    	autocomplete="off"
					    	value={filterText}
					    	placeholder="Search entries"
					    	oninput={debounce(fire('filterByText'), 100)}
					    	onblur={fire('blurTextFilter')}
					    	class="grow"/>
					  </form>
					}
				</span>

				<span class="nav-set">
					{view === '/entries' && showFilterInput &&
						<Icon icon="clear" key="header-clear" onclick={this.clearFilterText} class="grow"/>
				  }
				  {view === '/entries' && !showFilterInput &&
				  	<Icon icon="search" key="header-search" onclick={this.showFilterText} class="grow"/>
				  }
				  {(view === '/entry' || view === '/new') &&
				  	<Icon icon="copy" key="header-copy" onclick={this.copy} class="grow"/>
					}
					{entry && !entry.newEntry && (view === '/entry' || view === '/new') &&
						<Icon icon="delete" key="header-delete" onclick={fire('linkstate', {key: 'toastConfig', val: {type: 'confirm delete', data: entry.id}})} class="grow"/>
					}
				  <Icon icon="menu" key="header-menu" onclick={fire('linkstate', {key: 'toastConfig', val: {type: 'menu', data: dark}})}/>
				</span>

				{view === '/entries' &&
					<span class="button button--fab add-entry elevated grow">
						<a href="/entry/new">
							<Icon icon="clear" key="header-add"/>
						</a>
					</span>
				}
			</header>
		);
	}
}
