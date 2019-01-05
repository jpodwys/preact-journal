import { h, Component } from 'preact';
import Icon from '../icon';
import { fire } from '../../components/unifire';
import copyText from '../../js/copy-text';
import debounce from '../../js/debounce';

export default class Header extends Component {
	showFilterText = () => {
		fire('linkstate', {key: 'showFilterInput', val: true, cb: function(){
			setTimeout(() => this.base.querySelector('#filterTextInput').focus(), 200);
		}})();
	}

	cancelAndBlur = (e) => {
		e.preventDefault();
		this.base.querySelector('#filterTextInput').blur();
	}

	copy = () => {
		const date = document.getElementById('entryDate').innerText;
		const text = document.getElementById('entryText').innerText;
		copyText(date + ' ' + text);
	}

	render({ view, prevView, loggedIn, viewEntries, entry, filter, filterText, showFilterInput, dark }) {
		if(!loggedIn) return null;
		const entryCount = Array.isArray(viewEntries) ? viewEntries.length : 0;
		const filterIcon = filter === '' ? 'star-empty' : 'star-filled';
		const filterTo = filter === '' ? 'favorites' : '';
		const favoriteIcon = entry && entry.favorited ? 'star-filled' : 'star-empty';
		const formDirection = prevView === '/entry' && showFilterInput ? 'down' : 'up';

		return (
			<header class="elevated">
				<div class="inner-header">
					<div class="nav-set">
						{view === '/entries' && !showFilterInput &&
							<h3 class="fade-down">{`${entryCount} Entries`}</h3>
						}

						{(view === '/entry' || view === '/new' || (view === '/entries' && showFilterInput)) &&
							<a href="/entries">
								<Icon icon="back" key="header-back" class="fade-up"/>
							</a>
						}
					</div>

					<div class="nav-set flex-grow nav-search">
						{view === '/entries' && showFilterInput &&
							<form class={`search-form fade-${formDirection}`} onsubmit={this.cancelAndBlur}>
								<span class="nav-set">
									<Icon icon={filterIcon} onclick={fire('linkstate', { key: 'filter', val: filterTo })}/>
								</span>
						    <input
						    	id="filterTextInput"
						    	autocomplete="off"
						    	value={filterText}
						    	placeholder="Search entries"
						    	oninput={debounce(fire('filterByText'), 100)}/>
						  </form>
						}
					</div>

					<div class="nav-set">
					  {view === '/entries' && !showFilterInput && !filter &&
					  	<Icon icon="search" key="header-search" onclick={this.showFilterText} class="fade-down"/>
						}
						{(view === '/entry' || view === '/new') &&
							<Icon icon="copy" key="header-copy" onclick={this.copy} class="fade-up"/>
						}
						{entry && !entry.newEntry && (view === '/entry' || view === '/new') &&
							<Icon icon={favoriteIcon} onclick={fire('toggleFavorite', { id: entry.id, favorited: !entry.favorited })} class="fade-up"/>
						}
						{entry && !entry.newEntry && (view === '/entry' || view === '/new') &&
							<Icon icon="delete" key="header-delete" onclick={fire('linkstate', {key: 'dialogMode', val: 'modal'})} class="fade-up"/>
						}
					  <Icon icon="menu" key="header-menu" onclick={fire('linkstate', {key: 'dialogMode', val: 'menu'})}/>
					</div>

					{view === '/entries' &&
						<div class="button button--fab add-entry elevated grow">
							<a href="/entry/new">
								<Icon icon="clear" key="header-add"/>
							</a>
						</div>
					}
				</div>
			</header>
		);
	}
}
