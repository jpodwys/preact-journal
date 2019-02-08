import { h } from 'preact';
import Icon from '../icon';
import { fire } from '../../components/unifire';
import copyText from '../../js/copy-text';
import debounce from '../../js/debounce';

const showFilterText = () => {
	fire('linkstate', {key: 'showFilterInput', val: true, cb: function(){
		setTimeout(() => document.getElementById('filterTextInput').focus(), 200);
	}})();
}

const cancelAndBlur = (e) => {
	e.preventDefault();
	document.getElementById('filterTextInput').blur();
}

const copy = ({ date, text }) => copyText(date + ' ' + text);

export default ({ view, loggedIn, viewEntries, entry, filter, filterText, showFilterInput }) => {
	if(!loggedIn) return null;
	const entryCount = Array.isArray(viewEntries) ? viewEntries.length : 0;
	const filterIcon = filter === '' ? 'star-empty' : 'star-filled';
	const filterTo = filter === '' ? 'favorites' : '';
	const favoriteIcon = entry && entry.favorited ? 'star-filled' : 'star-empty';

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
						<form class="search-form fade-up" onsubmit={cancelAndBlur}>
							<span class="nav-set">
								<Icon icon={filterIcon} onclick={fire('linkstate', { key: 'filter', val: filterTo })}/>
							</span>
							<input
								id="filterTextInput"
								autocomplete="off"
								value={filterText}
								placeholder="Search"
								oninput={debounce(fire('filterByText'), 100)}/>
							<span class="nav-set">
								<span class="search-entry-count">{viewEntries.length}</span>
							</span>
						</form>
					}
				</div>

				<div class="nav-set">
					{view === '/entries' && !showFilterInput && !filter && !filterText &&
						<Icon icon="search" key="header-search" onclick={showFilterText} class="fade-down"/>
					}
					{(view === '/entry' || view === '/new') &&
						<Icon icon="copy" key="header-copy" onclick={() => copy(entry)} class="fade-up"/>
					}
					{entry && !entry.newEntry && (view === '/entry' || view === '/new') &&
						<Icon icon={favoriteIcon} onclick={fire('toggleFavorite', { id: entry.id, favorited: !entry.favorited })} class="fade-up"/>
					}
					{entry && !entry.newEntry && (view === '/entry' || view === '/new') &&
						<Icon icon="delete" key="header-delete" onclick={fire('linkstate', {key: 'dialogMode', val: 'modal:delete'})} class="fade-up"/>
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
