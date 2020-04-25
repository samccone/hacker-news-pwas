let app;
const API_BASE = 'https://hacker-news.firebaseio.com/v0'
const SECTION_MATCHER = /^\/$|top|new|show|ask|job/;
const STORY_MATCHER = /story\/(\d+$)/;

const windowExists = typeof window !== 'undefined';
const documentExists = typeof document !== 'undefined';
const a = 'appendChild';

if (documentExists) {
  app = document.querySelector('#a');
  document.onclick = (e) => {
    const t = e.target;

    if (t.dataset.scope || t.href && t.href.match(STORY_MATCHER)) {
      e.preventDefault();
      const storyId = (t.href.match(STORY_MATCHER) || [])[1];
      history.pushState(storyId ? { storyId } : 0, '', storyId ? `/story/${storyId}` : t.href);
      f(storyId)
    }
  }
}

/**
 * 
 * @param {string} storyId 
 */
function f(storyId) {
  if (storyId != null) {
    renderDetail(storyId);
  } else {
    let match = matchPath(SECTION_MATCHER);
    fetchAndShow(app, (match[0] === '/' ? 'top' : match[0]) + 'stories');
  }
}

if (windowExists) {
  window.onpopstate = e => {
    f((e.state || 0).storyId);
  };

  const match = matchPath(SECTION_MATCHER);
  let storyId = matchPath(STORY_MATCHER)
  if (match) {
    let url = match[0] === '/' ? 'top' : match[0];
    history.replaceState(0, '', '/' + url);
  } else {
    storyId = storyId[1]
    history.pushState({ storyId }, '', `/story/${storyId}`);
  }

  f(storyId);
}

async function json(url) {
  return await (await fetch(url)).json();
}

async function fetchAndShow(shell, scope) {
  const r = await json(`/stories.json?scope=${scope}&offset=0&num=30`);
  showStories(shell, r);
}

function showStories(appShell, stories) {
  appShell.innerHTML = '';
  _createElm = _createElm.bind(this);
  appShell[a](stories.reduce(
    (list, story) => list[a](renderStory(story)) && list,
    _createElm('ul', { id: 'stories' })));
}

/**
 * @param {Node} root
 * @param {boolean} recurse
 * @param {Array<StoryComment>} comments
 */
function renderCommentsInto(root, recurse, comments) {
  comments.filter(c => !c.deleted).map(renderComment).forEach(comment => {
    root[a](comment);
    recurse && fetchChildComments(comment.kids, root);
  });
}

async function fetchChildComments(children, root) {
  if (children && children.length) {
    const comments = await json(`/items.json?ids=${children.join(',')}`);
    renderCommentsInto(root, true, comments);
  }
}

/**
* @param {StoryComment} comment
*/
function renderComment(comment) {
  let kidRoot = _createElm(
    'ul', 0,
    _createElm(
      'li', 0, _createElm(
        'd', 0,
        _createElm('d', 0, comment.by)),
      _createElm(
        'p', { innerHTML: comment.text })));

  fetchChildComments(comment.kids, kidRoot);

  return kidRoot;
}

async function renderDetail(storyId) {
  // Empty the app DOM
  app.innerHTML = '';

  const story= await json(API_BASE + `/item/${storyId}.json`);
  const storyRoot = _createElm(
    'd', 0, renderStory(story, 'd', true));
  app[a](storyRoot);

  const kids = await json(`/items.json?ids=${story.kids.join(',')}`);
  const root = _createElm('ul', 0);
  renderCommentsInto(root, false, kids);
  storyRoot[a](root);
}

/**
 * @param {string} tagName
 * @param {DomAttrs|number} attrs
 * @param {...*} var_args
 */
function _createElm(tagName, attrs = 0, var_args) {
  const d = (documentExists ? document :  this.document); 
  const elm = d.createElement(tagName);

  for (let k in attrs) {
    elm[k] = attrs[k];
  }

  [...arguments].slice(2).forEach(
    n => elm[a](
      typeof n === 'string' ? d.createTextNode(n || '') : n));

  return elm;
}

/**
 * @param {Story} story
 * @param {string} rootTag
 * @param {boolean} withText
 */
function renderStory(story, rootTag = 'li', withText = false) {
  return _createElm(
    rootTag, 0,
    _createElm(
      'd', 0,
      _createElm(
        'd', { hidden: story.idx === undefined }, `${story.idx + 1}.`),
      _createElm(
        'd', 0,
        _createElm(
          'a',
          { href: story.url || `/story/${story.id}` },
          story.title),
        _createElm(
          'd', 0,
          _createElm('d', 0, `${story.score} points |`),
          _createElm('d', 0, `by ${story.by} |`),
          _createElm(
            'a', {
            href: `/story/${story.id}`,
            // Some stories have no descendants.
            hidden: story.descendants === undefined,
          },
            `${story.descendants} comments`)))),
    _createElm('d', {
      innerHTML: story.text,
      hidden: !(withText && story.text !== undefined)
    }));
}

function matchPath(matcher) {
  return window.location.pathname.match(matcher);
}

if (typeof module !== 'undefined') {
  module['exports'] = {
    'showStories': showStories,
  };
}
