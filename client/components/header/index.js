import { h } from 'preact';
import Icon from '../icon';
import { fire, useUnifire } from '../../components/unifire';
import copyText from '../../js/copy-text';
import debounce from '../../js/debounce';

const cancelAndBlur = (e) => {
	e.preventDefault();
	document.getElementById('filterTextInput').blur();
}

const getBackHref = (view, filter, filterText) => {
	if(view === '/search') return '/entries';
	return filter || filterText ? '/search' : '/entries';
};

const onBack = (e) => {
	if(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) return;
	e.preventDefault();
	e.stopPropagation();
	history.back();
};

const focusSearchInput = () => {
	setTimeout(() => document.getElementById('filterTextInput').focus(), 200);
};


export default () => {
	const [ _, { view, loggedIn, viewEntries = [], entry, filter, filterText } ] = useUnifire('view', 'loggedIn', 'viewEntries', 'entry', 'filter', 'filterText');
	if(!loggedIn) return;
	const entryCount = viewEntries.length;
	const filterIcon = filter === '' ? 'star-empty' : 'star-filled';
	const filterTo = filter === '' ? 'favorites' : '';
	const favoriteIcon = entry && entry.favorited ? 'star-filled' : 'star-empty';

	return (
		<header class="elevated">
			<div class="inner-header">
				<div class="nav-set">
					{view === '/entries' &&
						<h3 class="fade-down">{`${entryCount} Entries`}</h3>
					}

					{(view === '/search' || view === '/entry' || view === '/new') &&
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
						</form>
					}
				</div>

				<div class="nav-set">
					{view === '/entries' &&
						<a href="/search">
							<Icon icon="search" onclick={focusSearchInput} key="header-search" class="fade-down"/>
						</a>
					}
					{entry && !entry.newEntry && (view === '/entry' || view === '/new') &&
						<Icon icon="delete" key="header-delete" onclick={() => fire('showConfirmDeleteEntryModal', { entry })} class="fade-up"/>
					}
					{(view === '/entry' || view === '/new') &&
						<Icon icon="share" key="header-share" onclick={() => copyText(entry.date + ' ' + entry.text)} class="fade-up"/>
					}
					{entry && !entry.newEntry && (view === '/entry' || view === '/new') &&
						<Icon icon={favoriteIcon} onclick={() => fire('toggleFavorite', { id: entry.id, favorited: !entry.favorited })} class="fade-up"/>
					}
					<Icon icon="menu" key="header-menu" onclick={() => fire('linkstate', {key: 'dialogMode', val: 'menu'})}/>
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
