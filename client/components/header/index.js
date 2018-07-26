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
				<div class="inner-header">
					<div class="nav-set">
						{view === '/entries' && (vw > 400 || !showFilterInput) &&
							<h3 class="fly">{entryCount} Entries</h3>
						}

						{(view === '/entry' || view === '/new') &&
							<a href="/entries">
								<button class="icon-button">
									<Icon icon="back" key="header-back" class="reveal"/>
								</button>
							</a>
						}
					</div>

					<div class="nav-set flex-grow">
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
					</div>

					<div class="nav-set">
						{view === '/entries' && showFilterInput &&
							<button class="icon-button">
								<Icon icon="clear" key="header-clear" onclick={this.clearFilterText} class="reveal"/>
							</button>
					  }
					  {view === '/entries' && !showFilterInput &&
					  	<button class="icon-button">
					  		<Icon icon="search" key="header-search" onclick={this.showFilterText} class="fly"/>
					  	</button>
					  }
					  {(view === '/entry' || view === '/new') &&
					  	<button class="icon-button">
					  		<Icon icon="copy" key="header-copy" onclick={this.copy} class="reveal"/>
					  	</button>
						}
						{entry && !entry.newEntry && (view === '/entry' || view === '/new') &&
							<button class="icon-button">
								<Icon icon="delete" key="header-delete" onclick={fire('linkstate', {key: 'toastConfig', val: {type: 'confirm delete', data: entry.id}})} class="reveal"/>
							</button>
						}
						<button class="icon-button">
					  	<Icon icon="menu" key="header-menu" onclick={fire('linkstate', {key: 'toastConfig', val: {type: 'menu', data: dark}})}/>
					  </button>
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
