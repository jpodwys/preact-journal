import { h, Component } from 'preact';
import Icon from '../icon';
import { fire } from '../../components/unifire';
import copyText from '../../js/copy-text';
import debounce from '../../js/debounce';

const supportedIcons = ['star-filled', 'star-empty', 'clear'];

export default class Header extends Component {
	handleBlur = (e) => {
		const target = e.relatedTarget || e.explicitOriginalTarget;
		let id;
		let icon;
		if(target){
			id = target.id;
			icon = target.getAttribute('icon');
		}
		if(id === 'filterTextInput' || ~supportedIcons.indexOf(icon) && this.base.contains(target)) return;
		fire('blurTextFilter')();
	}

	clearFilters = (filter, filterText) => {
		if(filter || filterText){
			this.base.querySelector('#filterTextInput').focus();
			fire('clearFilters')();
		} else {
			fire('linkstate', { key: 'showFilterInput', val: false })();
		}
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
		const date = document.getElementById('entryDate').innerText;
		const text = document.getElementById('entryText').innerText;
		copyText(date + ' ' + text);
	}

	render({ view, loggedIn, viewEntries, entry, filter, filterText, showFilterInput, dark }) {
		if(!loggedIn) return null;
		const vw = window.innerWidth;
		const entryCount = Array.isArray(viewEntries) ? viewEntries.length : 0;
		const entryCountDisplay = (vw < 425 && showFilterInput) ? entryCount : `${entryCount} Entries`;
		const filterIcon = filter === '' ? 'star-empty' : 'star-filled';
		const filterTo = filter === '' ? 'favorites' : '';
		const favoriteIcon = entry && entry.favorited ? 'star-filled' : 'star-empty';
		return (
			<header class="elevated">
				<div class="inner-header">
					<div class="nav-set flex-grow">
						{view === '/entries' && (vw > 350 || !showFilterInput) &&
							<h3 class="fade-down">{entryCountDisplay}</h3>
						}

						{(view === '/entry' || view === '/new') &&
							<a href="/entries">
								<Icon icon="back" key="header-back" class="fade-up"/>
							</a>
						}
					</div>

					<div class="nav-set nav-search">
						{view === '/entries' && showFilterInput &&
							<form class="search-form grow" onsubmit={this.cancelAndBlur}>
								<span class="nav-set">
									<Icon
										icon={filterIcon}
										onblur={this.handleBlur}
										onclick={fire('linkstate', { key: 'filter', val: filterTo })}/>
								</span>
						    <input
						    	id="filterTextInput"
						    	autocomplete="off"
						    	value={filterText}
						    	placeholder="Search entries"
						    	oninput={debounce(fire('filterByText'), 100)}
						    	onblur={this.handleBlur}/>
						  </form>
						}
					</div>

					<div class="nav-set">
						{view === '/entries' && (showFilterInput || filter === 'favorites') &&
							<Icon icon="clear" key="header-clear" onclick={() => this.clearFilters(filter, filterText)} class="fade-up"/>
					  }
					  {view === '/entries' && !showFilterInput && !filter &&
					  	<Icon icon="search" key="header-search" onclick={this.showFilterText} class="fade-down"/>
						}
						{entry && !entry.newEntry && (view === '/entry' || view === '/new') &&
							<Icon icon="delete" key="header-delete" onclick={fire('linkstate', {key: 'toastConfig', val: {type: 'confirm delete', data: entry.id}})} class="fade-up"/>
						}
						{view === '/entry' && entry && !entry.newEntry &&
							<Icon icon={favoriteIcon} onclick={fire('toggleFavorite', { id: entry.id, favorited: !entry.favorited })} class="fade-up"/>
						}
						{(view === '/entry' || view === '/new') &&
							<Icon icon="copy" key="header-copy" onclick={this.copy} class="fade-up"/>
						}
					  <Icon icon="menu" key="header-menu" onclick={fire('linkstate', {key: 'toastConfig', val: {type: 'menu', data: dark}})}/>
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
