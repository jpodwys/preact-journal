import { h } from 'preact';
import Icon from '../icon';
import { fire } from '../../components/unifire';
import copyText from '../../js/copy-text';
import debounce from '../../js/debounce';

const cancelAndBlur = e => {
	e.preventDefault();
	document.getElementById('filterTextInput').blur();
}

const getBackHref = (view, filter, filterText) => {
	if(view === '/search') return '/entries';
	return filter || filterText ? '/search' : '/entries';
};

const onBack = e => {
	if(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) return;
	e.preventDefault();
	e.stopPropagation();
	history.back();
};

const focusSearchInput = () => {
	setTimeout(() => document.getElementById('filterTextInput').focus(), 200);
};


export default ({ view, loggedIn, viewEntries = [], entry, filter, filterText }) => {
	if(!loggedIn) return;
	const entryCount = viewEntries.length;
	const filterIcon = filter === '' ? 'star-empty' : 'star-filled';
	const filterTo = filter === '' ? 'favorites' : '';
	const favoriteIcon = entry && entry.favorited ? 'star-filled' : 'star-empty';
	const isEntry = view === '/entry' || view === '/new';

	return (
		<header class="dark-fill">
			<div class="inner-header">
				<div class="nav-set">
					{view === '/entries' &&
						<span class="h3 fade-down">{`${entryCount} Entries`}</span>
					}

					{(view === '/search' || isEntry) &&
						<a href={getBackHref(view, filter, filterText)} onclick={onBack}>
							<Icon icon="back" key="header-back" class="fade-up"/>
						</a>
					}
				</div>

				<div class="nav-set flex-grow nav-search">
					{view === '/search' &&
						<form class="search-form fade-up" onsubmit={cancelAndBlur}>
							<span class="nav-set">
								<Icon icon={filterIcon} onclick={() => fire('linkstate', { key: 'filter', val: filterTo })}/>
							</span>
							<input
								id="filterTextInput"
								autocomplete="off"
								value={filterText}
								placeholder="Search"
								oninput={debounce((e) => fire('filterByText', e.target.value), 100)}/>
							<span class="nav-set">
								<span class="search-entry-count">{entryCount}</span>
							</span>
							<span class="nav-set">
								<Icon icon="clear" key="header-clear" onclick={() => fire('clearFilters')}/>
							</span>
						</form>
					}
				</div>

				<div class="nav-set">
					{view === '/entries' &&
						<a href="/search">
							<Icon icon="search" onclick={focusSearchInput} key="header-search" class="fade-down"/>
						</a>
					}
					{entry && !entry.newEntry && isEntry &&
						<Icon icon="delete" key="header-delete" onclick={() => fire('showConfirmDeleteEntryModal', { entry })} class="fade-up"/>
					}
					{isEntry &&
						<Icon icon="share" key="header-share" onclick={() => copyText(entry.date + ' ' + entry.text)} class="fade-up"/>
					}
					{entry && !entry.newEntry && isEntry &&
						<Icon icon={favoriteIcon} onclick={() => fire('toggleFavorite', { id: entry.id, favorited: !entry.favorited })} class="fade-up"/>
					}
				</div>

				<div class="nav-set">
					<Icon icon="menu" key="header-menu" onclick={() => fire('linkstate', {key: 'dialogMode', val: 'menu'})} class="fade-down"/>
				</div>

				{view === '/entries' &&
					<div class="button button--fab add-entry elevated grow">
						<a href="/entry/new">
							<Icon icon="clear" key="header-add" class="rotate45"/>
						</a>
					</div>
				}
			</div>
		</header>
	);
}
