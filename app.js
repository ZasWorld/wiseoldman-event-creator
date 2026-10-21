const API = "https://api.wiseoldman.net/v2";
const STORE_KEY = "womEventSettings";
const skills = ["overall","attack","defence","strength","hitpoints","ranged","prayer","magic","cooking","woodcutting","fletching","fishing","firemaking","crafting","smithing","mining","herblore","agility","thieving","slayer","farming","runecrafting","hunter","construction","sailing"];
const bosses = ["abyssal_sire","alchemical_hydra","amoxliatl","araxxor","artio","barrows_chests","bryophyta","callisto","calvarion","cerberus","chambers_of_xeric","chambers_of_xeric_challenge_mode","chaos_elemental","chaos_fanatic","commander_zilyana","corporeal_beast","crazy_archaeologist","dagannoth_prime","dagannoth_rex","dagannoth_supreme","deranged_archaeologist","doom_of_mokhaiotl","duke_sucellus","general_graardor","giant_mole","grotesque_guardians","hespori","kalphite_queen","king_black_dragon","kraken","kreearra","kril_tsutsaroth","mimic","nex","nightmare","phosanis_nightmare","obor","phantom_muspah","sarachnis","scorpia","scurrius","shellbane_gryphon","skotizo","sol_heredit","spindel","tempoross","the_gauntlet","the_corrupted_gauntlet","the_hueycoatl","the_leviathan","the_whisperer","theatre_of_blood","theatre_of_blood_hard_mode","thermonuclear_smoke_devil","tombs_of_amascut","tombs_of_amascut_expert","tztok_jad","tzkal_zuk","vardorvis","venenatis","vetion","vorkath","wintertodt","yama","zalcano","zulrah"];
const metricGroups = {Skills: skills, Bosses: bosses};
const exclusionGroups = {
  raids: ["chambers_of_xeric","chambers_of_xeric_challenge_mode","theatre_of_blood","theatre_of_blood_hard_mode","tombs_of_amascut","tombs_of_amascut_expert"],
  slayer: ["abyssal_sire","alchemical_hydra","araxxor","cerberus","grotesque_guardians","kraken","thermonuclear_smoke_devil","shellbane_gryphon"],
  hespori: ["hespori"], mimic: ["mimic"],
  wilderness: ["king_black_dragon","callisto","artio","calvarion","vetion","scorpia","chaos_elemental","chaos_fanatic","venenatis","spindel","crazy_archaeologist"],
  hardmodes: ["chambers_of_xeric_challenge_mode","theatre_of_blood_hard_mode","the_corrupted_gauntlet","tombs_of_amascut_expert","phosanis_nightmare"],
  inferno: ["tzkal_zuk","sol_heredit"]
};
const commonRoles = ["owner","deputy_owner","leader","administrator","moderator","member"];
const allRoles = "achiever adamant adept administrator admiral adventurer air anchor apothecary archer armadylean artillery artisan asgarnian assassin assistant astral athlete attacker bandit bandosian barbarian battlemage beast berserker blisterwood blood blue bob body brassican brawler brigadier brigand bronze bruiser bulwark burglar burnt cadet captain carry champion chaos cleric collector colonel commander competitor completionist constructor cook coordinator corporal cosmic councillor crafter crew crusader cutpurse death defender defiler deputy_owner destroyer diamond diseased doctor dogsbody dragon dragonstone druid duellist earth elite emerald enforcer epic executive expert explorer farmer feeder fighter fire firemaker firestarter fisher fletcher forager fremennik gamer gatherer general gnome_child gnome_elder goblin gold goon green grey guardian guthixian harpoon healer hellcat helper herbologist hero holy hoarder hunter ignitor illusionist imp infantry inquisitor iron jade justiciar kandarin karamjan kharidian kitten knight labourer law leader learner legacy legend legionnaire lieutenant looter lumberjack magic magician major maple marshal master maxed mediator medic mentor member merchant mind miner minion misthalinian mithril moderator monarch morytanian mystic myth natural nature necromancer ninja noble novice nurse oak officer onyx opal oracle orange owner page paladin pawn pilgrim pine pink prefect priest private prodigy proselyte prospector protector pure purple pyromancer quester racer raider ranger record_chaser recruit recruiter red_topaz red rogue ruby rune runecrafter sage sapphire saradominist saviour scavenger scholar scourge scout scribe seer senator sentry serenist sergeant shaman sheriff short_green_guy skiller skulled slayer smiter smith smuggler sniper soul specialist speed_runner spellcaster squire staff steel strider striker summoner superior supervisor teacher templar therapist thief tirannian trialist trickster tzkal tztok unholy vagrant vanguard walker wanderer warden warlock warrior water wild willow wily wintumber witch wizard worker wrath xerician yellow yew zamorakian zarosian zealot zenyte".split(" ");
const roleChoices = [...new Set([...commonRoles, ...allRoles])];
const pretty = value => value.split("_").map(word => word.toLowerCase() === "ehp" ? "EHP" : word.toLowerCase() === "ehb" ? "EHB" : word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
const byId = id => document.getElementById(id);
const loadSettings = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch { return {}; } };
let settings = loadSettings();
delete settings.allowRequests;
let roster = [];
let rosterSort = 0;
const sortModes = ["Alphabetical", "Rank", "Time in clan"];
let randomPool = [];
let selectedDraw = null;
let selectedCompetition = null;
let toastTimer;
const memberDialog = byId("member-dialog");
const confirmDialog = byId("confirm-dialog");

function persistSettings() {
  localStorage.setItem(STORE_KEY, JSON.stringify(settings));
  updateConnectionDisplay();
  updateGroupDisplay();
}
function updateConnectionDisplay() {
  const connected = Boolean(settings.groupId);
  [byId("connection-label"), byId("mobile-connection")].forEach(node => {
    node.classList.toggle("connected", connected);
    if (node.id === "connection-label") node.textContent = connected ? "Clan selected" : "No clan selected";
    if (node.id === "mobile-connection") node.title = connected ? "Wise Old Man clan selected" : "No clan selected";
  });
}
function updateGroupDisplay() {
  const name = settings.groupName || (settings.groupId ? `Group ${settings.groupId}` : "No group selected");
  byId("active-group-name").textContent = name;
  byId("config-group-name").textContent = settings.groupName || "No group selected";
  byId("config-group-id").textContent = settings.groupId ? `Group ID ${settings.groupId}` : "Search above to choose one";
}
function setStatus(target, message, type = "") {
  target.replaceChildren();
  target.className = "status-box" + (type ? ` ${type}` : "");
  target.textContent = message;
}
function toast(message) {
  const node = byId("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 2800);
}
function requireGroupAndCode() {
  if (!settings.groupId || !settings.verification) {
    toast("Select a group and save its verification code in Configuration.");
    openView("config");
    return false;
  }
  return true;
}
async function api(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {Accept: "application/json", ...(options.body ? {"Content-Type": "application/json"} : {}), ...(options.headers || {})},
      signal: controller.signal
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {message: text}; }
    if (!response.ok) throw new Error(data.message || data.error || `Wise Old Man returned ${response.status}.`);
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The request timed out. Wise Old Man may still be processing it; check the site before retrying.");
    if (error instanceof TypeError) throw new Error("Could not reach Wise Old Man. Check your connection and try again.");
    throw error;
  } finally { clearTimeout(timer); }
}
function postJson(path, body, method = "POST") { return api(path, {method, body: JSON.stringify(body)}); }
function openView(view) {
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll(".view").forEach(section => section.classList.toggle("active", section.id === `view-${view}`));
  const titles = {
    create: ["Create an event", "Set up your next clan competition."],
    pick: ["Event picker", "Spin once to choose the clan’s next skill or boss challenge."],
    members: ["Clan members", "Manage your Wise Old Man group roster."],
    events: ["Competitions", "Follow upcoming events, live standings, and group updates."],
    bingo: ["Bingo maker", "Build a monster board and assign your clan to teams."],
    config: ["Configuration", "Choose your Wise Old Man group and connection settings."]
  };
  byId("page-title").textContent = titles[view][0];
  byId("page-subtitle").textContent = titles[view][1];
  window.scrollTo({top: 0, behavior: "smooth"});
}
document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => openView(button.dataset.view)));
document.querySelectorAll("[data-open-view]").forEach(button => button.addEventListener("click", () => openView(button.dataset.openView)));
document.querySelectorAll(".brand").forEach(button => button.addEventListener("click", event => { event.preventDefault(); openView("create"); }));

// Create event
const kind = byId("kind");
const metric = byId("metric");
Object.keys(metricGroups).forEach((name, index) => kind.add(new Option(name, name, index === 0, index === 0)));
function fillMetrics() {
  metric.replaceChildren(...metricGroups[kind.value].map((value, index) => new Option(pretty(value), value, index === 0, index === 0)));
}
kind.addEventListener("change", fillMetrics);
fillMetrics();
function localDateValue(date) {
  const part = value => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`;
}
const initialStart = new Date();
initialStart.setMinutes(0, 0, 0);
if (initialStart.getHours() >= 20) initialStart.setDate(initialStart.getDate() + 1);
initialStart.setHours(20);
const initialEnd = new Date(initialStart);
initialEnd.setDate(initialEnd.getDate() + 7);
byId("starts").value = localDateValue(initialStart);
byId("ends").value = localDateValue(initialEnd);
function isoFromLocal(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error("Choose valid start and end dates.");
  return date.toISOString();
}
byId("event-form").addEventListener("submit", async event => {
  event.preventDefault();
  const result = byId("result");
  if (!requireGroupAndCode()) { setStatus(result, "Choose a group and enter its verification code in Configuration.", "error"); return; }
  const title = byId("title").value.trim();
  let startsAt, endsAt;
  try { startsAt = isoFromLocal(byId("starts").value); endsAt = isoFromLocal(byId("ends").value); }
  catch (error) { setStatus(result, error.message, "error"); return; }
  if (new Date(endsAt) <= new Date(startsAt)) { setStatus(result, "The end date must be after the start date.", "error"); return; }
  const submit = byId("submit");
  submit.disabled = true;
  submit.innerHTML = "<span>Creating competition…</span><span class=\"loader\"></span>";
  setStatus(result, "Sending your competition to Wise Old Man…");
  try {
    const response = await postJson("/competitions", {title, metric: metric.value, startsAt, endsAt, groupId: Number(settings.groupId), groupVerificationCode: settings.verification});
    const competition = response.competition || response;
    const id = competition.id;
    result.replaceChildren();
    result.className = "status-box success";
    result.append(document.createTextNode("Competition created successfully. "));
    if (id) {
      const link = document.createElement("a");
      link.href = `https://wiseoldman.net/competitions/${encodeURIComponent(id)}`;
      link.target = "_blank"; link.rel = "noopener"; link.textContent = "View competition";
      result.append(link);
    }
    toast("Competition created.");
  } catch (error) { setStatus(result, `Could not create the competition: ${error.message}`, "error"); }
  finally { submit.disabled = false; submit.innerHTML = "<span>Create competition</span><span aria-hidden=\"true\">↗</span>"; }
});

// Random event picker and exclusions
function eligibleBosses() {
  const excluded = new Set();
  document.querySelectorAll("[data-exclusion]:checked").forEach(box => (exclusionGroups[box.dataset.exclusion] || []).forEach(value => excluded.add(value)));
  return bosses.filter(value => !excluded.has(value));
}
function getPool() {
  const eligible = eligibleBosses();
  return [...skills.map(value => ({category: "Skills", metric: value, title: `VB SoTW - ${pretty(value)}`})), ...eligible.map(value => ({category: "Bosses", metric: value, title: `VB BoTW - ${pretty(value)}`}))];
}
function paintPool(repeat = 1) {
  randomPool = getPool();
  byId("pool-count").textContent = `${randomPool.length} eligible events · ${skills.length} skills · ${eligibleBosses().length} bosses`;
  byId("picker-strip").replaceChildren(...Array.from({length: repeat}, (_, lap) => randomPool.map((item, index) => {
    const row = document.createElement("div");
    row.className = "spin-row";
    row.textContent = item.title;
    row.dataset.index = index;
    row.dataset.lap = lap;
    return row;
  })).flat());
  byId("spin-window").scrollTop = 0;
}
document.querySelectorAll("[data-exclusion]").forEach(box => box.addEventListener("change", () => {
  selectedDraw = null;
  byId("drawn").textContent = "Ready when you are";
  byId("pick-status").textContent = "Spin to choose from the updated list.";
  byId("use-draw").disabled = true;
  paintPool();
}));
document.querySelectorAll(".info-button").forEach(button => button.addEventListener("click", event => {
  event.preventDefault(); event.stopPropagation();
  const open = button.dataset.open === "true";
  document.querySelectorAll(".info-button").forEach(item => item.dataset.open = "false");
  if (!open) button.dataset.open = "true";
}));
document.addEventListener("click", event => { if (!event.target.closest(".info-button")) document.querySelectorAll(".info-button").forEach(button => button.dataset.open = "false"); });
paintPool();
byId("draw").addEventListener("click", () => {
  if (!randomPool.length) return;
  const skillsPool = randomPool.filter(item => item.category === "Skills");
  const bossPool = randomPool.filter(item => item.category === "Bosses");
  let chosen;
  if (skillsPool.length && bossPool.length) chosen = Math.random() < .5 ? skillsPool[Math.floor(Math.random() * skillsPool.length)] : bossPool[Math.floor(Math.random() * bossPool.length)];
  else { const remaining = skillsPool.length ? skillsPool : bossPool; chosen = remaining[Math.floor(Math.random() * remaining.length)]; }
  const selectedIndex = randomPool.findIndex(item => item.title === chosen.title);
  const draw = byId("draw"), strip = byId("picker-strip"), viewport = byId("spin-window");
  draw.disabled = true; byId("use-draw").disabled = true;
  byId("pick-status").textContent = "The list is spinning…";
  paintPool(5);
  const rowHeight = 43;
  const targetRow = randomPool.length * 3 + selectedIndex;
  const target = Math.max(0, targetRow * rowHeight - (viewport.clientHeight - rowHeight) / 2);
  const duration = Math.min(4800, Math.max(3000, 2800 + randomPool.length * 4));
  const started = performance.now();
  const animate = now => {
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 4.2);
    viewport.scrollTop = target * eased;
    if (progress < 1) requestAnimationFrame(animate);
    else {
      viewport.scrollTop = target;
      strip.querySelectorAll(".spin-row").forEach(row => row.classList.toggle("winner", Number(row.dataset.index) === selectedIndex && Number(row.dataset.lap) === 3));
      selectedDraw = chosen;
      byId("drawn").textContent = chosen.title;
      byId("pick-status").textContent = "Selected! Use this event to fill in the competition form.";
      draw.disabled = false; draw.innerHTML = "<span>Spin again</span><span>⟳</span>";
      byId("use-draw").disabled = false;
    }
  };
  requestAnimationFrame(animate);
});
byId("use-draw").addEventListener("click", () => {
  if (!selectedDraw) return;
  kind.value = selectedDraw.category; fillMetrics(); metric.value = selectedDraw.metric;
  byId("title").value = selectedDraw.title;
  setStatus(byId("result"), "");
  openView("create");
});

// Configuration and Wise Old Man group search
function populateConfiguration() {
  byId("group-search").value = settings.groupName || "";
  byId("verification").value = settings.verification || "";
  updateGroupDisplay(); updateConnectionDisplay();
}
populateConfiguration();
byId("verification").addEventListener("input", () => {
  settings.verification = byId("verification").value.trim();
  persistSettings();
});
byId("save-config").addEventListener("click", () => {
  settings.verification = byId("verification").value.trim();
  persistSettings();
  setStatus(byId("config-result"), "Configuration saved in this browser on this device.", "success");
  toast("Configuration saved.");
});
byId("search-groups").addEventListener("click", async () => {
  const query = byId("group-search").value.trim();
  const results = byId("group-results"); results.replaceChildren();
  if (!query) { setStatus(byId("config-result"), "Type a clan name before searching.", "error"); return; }
  byId("search-groups").disabled = true; byId("search-groups").textContent = "Searching…";
  try {
    const groups = await api(`/groups?name=${encodeURIComponent(query)}&limit=20`);
    if (!Array.isArray(groups) || groups.length === 0) results.innerHTML = '<div class="empty-state">No groups found. Check the name and try again.</div>';
    else groups.forEach(group => {
      const button = document.createElement("button"); button.type = "button"; button.className = "group-result";
      const left = document.createElement("b"); left.textContent = group.name || `Group ${group.id}`;
      const right = document.createElement("small"); right.textContent = `${group.memberCount ?? 0} members · ID ${group.id}`;
      button.append(left, right);
      button.addEventListener("click", () => {
        settings.groupId = String(group.id); settings.groupName = group.name || `Group ${group.id}`;
        byId("group-search").value = settings.groupName; persistSettings();
        results.replaceChildren(); setStatus(byId("config-result"), `Selected ${settings.groupName}. Your clan is saved on this device.`, "success");
      });
      results.append(button);
    });
    if (groups.length) setStatus(byId("config-result"), `${groups.length} group match${groups.length === 1 ? "" : "es"}. Choose your clan below.`, "success");
  } catch (error) { setStatus(byId("config-result"), `Could not search groups: ${error.message}`, "error"); }
  finally { byId("search-groups").disabled = false; byId("search-groups").innerHTML = 'Search Wise Old Man <span>⌕</span>'; }
});
byId("clear-group").addEventListener("click", () => {
  settings.groupId = ""; settings.groupName = ""; persistSettings();
  setStatus(byId("config-result"), "No group is selected.");
});
byId("clear-credentials").addEventListener("click", async () => {
  const confirmed = await askConfirmation("Clear saved configuration?", "This removes the selected group and verification code from this browser.", "Clear settings", true);
  if (!confirmed) return;
  settings = {}; persistSettings(); populateConfiguration(); byId("group-results").replaceChildren();
  setStatus(byId("config-result"), "Saved configuration cleared.", "success");
});
if (settings.groupId && !settings.groupName) {
  api(`/groups/${encodeURIComponent(settings.groupId)}`).then(group => {
    settings.groupName = group.name || `Group ${settings.groupId}`; persistSettings();
  }).catch(() => {});
}

// Clan member roster, detail cards, sorting, and changes
function tenure(joinedAt) {
  if (!joinedAt) return "Not available";
  const joined = new Date(joinedAt);
  if (Number.isNaN(joined.getTime())) return "Not available";
  const days = Math.max(0, Math.floor((Date.now() - joined.getTime()) / 86400000));
  if (days >= 365) { const years = Math.floor(days / 365); const months = Math.floor(days % 365 / 30); return `${years} year${years === 1 ? "" : "s"}${months ? `, ${months} month${months === 1 ? "" : "s"}` : ""}`; }
  if (days >= 30) { const months = Math.floor(days / 30); return `${months} month${months === 1 ? "" : "s"}`; }
  if (days >= 7) { const weeks = Math.floor(days / 7); return `${weeks} week${weeks === 1 ? "" : "s"}`; }
  return `${days} day${days === 1 ? "" : "s"}`;
}
function roleOrder(role) {
  const key = (role || "").toLowerCase();
  return ({owner: 0, deputy_owner: 1, leader: 2, administrator: 3, moderator: 4, member: 6})[key] ?? 5;
}
function compareRoster(a, b) {
  const name = a.displayName.localeCompare(b.displayName, undefined, {sensitivity: "base"});
  if (rosterSort === 1) return roleOrder(a.role) - roleOrder(b.role) || (a.role || "").localeCompare(b.role || "", undefined, {sensitivity: "base"}) || name;
  if (rosterSort === 2) {
    const left = a.joinedAt ? new Date(a.joinedAt).getTime() : Number.POSITIVE_INFINITY;
    const right = b.joinedAt ? new Date(b.joinedAt).getTime() : Number.POSITIVE_INFINITY;
    return left - right || name;
  }
  return name;
}
function renderRoster() {
  const list = byId("member-list");
  const query = byId("member-search").value.trim().toLocaleLowerCase();
  const filtered = roster.filter(member => member.displayName.toLocaleLowerCase().includes(query)).sort(compareRoster);
  byId("member-count").textContent = query ? `${filtered.length}/${roster.length}` : String(roster.length || "—");
  list.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement("div"); empty.className = "empty-state";
    empty.textContent = roster.length ? "No members match that search." : "Select a Wise Old Man group in Configuration, then refresh the roster.";
    list.append(empty); return;
  }
  filtered.forEach(member => {
    const wrapper = document.createElement("div"); wrapper.className = "member-row"; wrapper.dataset.username = member.username;
    const avatar = document.createElement("span"); avatar.className = "member-avatar";
    const roleIcon = document.createElement("img"); roleIcon.className = "member-role-icon";
    const iconRole = (member.role || "member").toLowerCase() === "member" ? "minion" : (member.role || "member").toLowerCase();
    roleIcon.src = `./img/group_roles/${encodeURIComponent(iconRole)}.png`;
    roleIcon.alt = `${pretty(member.role || "member")} rank icon`; roleIcon.decoding = "async";
    const roleFallback = document.createElement("span"); roleFallback.className = "member-role-fallback"; roleFallback.textContent = pretty(member.role || "member").slice(0, 1).toUpperCase(); roleFallback.hidden = true;
    roleIcon.addEventListener("error", () => { roleIcon.hidden = true; roleFallback.hidden = false; }, {once: true});
    avatar.append(roleIcon, roleFallback);
    const nameBlock = document.createElement("div"); nameBlock.className = "member-name"; nameBlock.textContent = member.displayName;
    const sub = document.createElement("span"); sub.className = "member-sub"; sub.textContent = "Tap to see role and time in clan"; nameBlock.append(sub);
    const role = document.createElement("span"); role.className = "member-rank"; role.textContent = pretty(member.role || "member");
    wrapper.append(avatar, nameBlock, role);
    const details = document.createElement("div"); details.className = "member-detail";
    const roleDetail = document.createElement("span"); roleDetail.textContent = "WISE OLD MAN ROLE";
    const roleValue = document.createElement("b"); roleValue.textContent = pretty(member.role || "No role"); roleDetail.append(roleValue);
    const timeDetail = document.createElement("span"); timeDetail.textContent = "TIME IN CLAN";
    const timeValue = document.createElement("b"); timeValue.textContent = tenure(member.joinedAt); timeDetail.append(timeValue);
    details.append(roleDetail, timeDetail); wrapper.append(details);
    const actions = document.createElement("div"); actions.className = "member-action-row";
    const edit = document.createElement("button"); edit.type = "button"; edit.className = "small-action"; edit.textContent = "Edit role";
    edit.addEventListener("click", event => { event.stopPropagation(); openMemberEditor("role", member); });
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "small-action danger-text"; remove.textContent = "Remove";
    remove.addEventListener("click", event => { event.stopPropagation(); removeMember(member); });
    actions.append(edit, remove); wrapper.append(actions);
    wrapper.addEventListener("click", () => wrapper.classList.toggle("expanded"));
    list.append(wrapper);
  });
}
async function loadMembers() {
  if (!settings.groupId) {
    toast("Select your Wise Old Man group in Configuration first.");
    openView("config");
    return;
  }
  const button = byId("refresh-members"); button.disabled = true; button.textContent = "Loading…";
  setStatus(byId("member-status"), "Loading clan members…");
  try {
    const group = await api(`/groups/${encodeURIComponent(settings.groupId)}`);
    roster = (group.memberships || []).map(membership => {
      const player = membership.player || {};
      const username = player.username || player.displayName;
      const displayName = player.displayName || player.username;
      return {username, displayName, role: membership.role || "member", joinedAt: membership.clientSyncJoinedAt || membership.createdAt || null};
    }).filter(member => member.username && member.displayName);
    renderRoster();
    setStatus(byId("member-status"), `${roster.length} clan member${roster.length === 1 ? "" : "s"} loaded.`, "success");
  } catch (error) { setStatus(byId("member-status"), `Could not load members: ${error.message}`, "error"); }
  finally { button.disabled = false; button.innerHTML = "↻ <span>Refresh</span>"; }
}
byId("refresh-members").addEventListener("click", loadMembers);
let membersAutoRefreshAttempted = false;
document.querySelectorAll('.nav-item[data-view="members"], [data-open-view="members"]').forEach(button => button.addEventListener("click", () => {
  if (membersAutoRefreshAttempted) return;
  if (!settings.groupId) { loadMembers(); return; }
  membersAutoRefreshAttempted = true;
  loadMembers();
}));
byId("member-search").addEventListener("input", renderRoster);
byId("sort-members").addEventListener("click", () => {
  rosterSort = (rosterSort + 1) % sortModes.length;
  byId("sort-members").innerHTML = `Sort: ${sortModes[rosterSort]} <span>↕</span>`;
  renderRoster();
});
function openMemberEditor(mode, member = null) {
  if (!requireGroupAndCode()) return;
  const fields = byId("member-dialog-fields"); fields.replaceChildren();
  byId("member-dialog-kicker").textContent = mode === "add" ? "ADD TO ROSTER" : "WISE OLD MAN ROLE";
  byId("member-dialog-title").textContent = mode === "add" ? "Add a clan member" : `Edit ${member.displayName}’s role`;
  if (mode === "add") {
    const nameLabel = document.createElement("label"); nameLabel.className = "field"; nameLabel.textContent = "RuneScape name";
    const name = document.createElement("input"); name.required = true; name.maxLength = 30; name.id = "new-member-name"; name.placeholder = "Player name"; nameLabel.append(name); fields.append(nameLabel);
  }
  const roleLabel = document.createElement("label"); roleLabel.className = "field"; roleLabel.textContent = mode === "add" ? "Initial role" : "New role";
  const select = document.createElement("select"); select.id = "member-role";
  roleChoices.forEach(role => select.add(new Option(pretty(role), role)));
  select.value = member?.role || "member";
  roleLabel.append(select); fields.append(roleLabel);
  byId("member-dialog-submit").textContent = mode === "add" ? "Add member" : "Save role";
  memberDialog.dataset.mode = mode; memberDialog.dataset.username = member?.username || "";
  memberDialog.showModal();
  if (mode === "add") setTimeout(() => byId("new-member-name").focus(), 30);
}
byId("add-member").addEventListener("click", () => openMemberEditor("add"));
byId("member-dialog-form").addEventListener("submit", async event => {
  if (event.submitter && event.submitter.value !== "submit") return;
  event.preventDefault();
  const mode = memberDialog.dataset.mode;
  const role = byId("member-role").value;
  const username = mode === "add" ? byId("new-member-name").value.trim() : memberDialog.dataset.username;
  if (!username) return;
  const submit = byId("member-dialog-submit"); submit.disabled = true; submit.textContent = "Saving…";
  try {
    if (mode === "add") await postJson(`/groups/${encodeURIComponent(settings.groupId)}/members`, {verificationCode: settings.verification, members: [{username, role}]});
    else await postJson(`/groups/${encodeURIComponent(settings.groupId)}/role`, {verificationCode: settings.verification, username, role}, "PUT");
    memberDialog.close();
    setStatus(byId("member-status"), mode === "add" ? `${username} was added. Refreshing roster…` : `${username}’s role was updated. Refreshing roster…`, "success");
    await loadMembers();
  } catch (error) { setStatus(byId("member-status"), `Member update failed: ${error.message}`, "error"); }
  finally { submit.disabled = false; submit.textContent = mode === "add" ? "Add member" : "Save role"; }
});
async function removeMember(member) {
  const confirmed = await askConfirmation("Remove this clan member?", `Remove ${member.displayName} from the selected Wise Old Man group?`, "Remove member", true);
  if (!confirmed) return;
  setStatus(byId("member-status"), `Removing ${member.displayName}…`);
  try {
    await postJson(`/groups/${encodeURIComponent(settings.groupId)}/members`, {verificationCode: settings.verification, members: [member.username]}, "DELETE");
    setStatus(byId("member-status"), `${member.displayName} was removed. Refreshing roster…`, "success"); await loadMembers();
  } catch (error) { setStatus(byId("member-status"), `Could not remove member: ${error.message}`, "error"); }
}

// Upcoming and ongoing competitions with detail standings and deletion
function formatDate(value, includeTime = true) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, includeTime ? {month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"} : {month: "short", day: "numeric", year: "numeric"}).format(date);
}
function renderStanding(participations) {
  const sorted = (participations || []).map(item => {
    const player = item.player || {};
    const progress = item.progress || {};
    return {name: player.displayName || player.username || "Unknown player", gained: Number(progress.gained), hasGained: Number.isFinite(Number(progress.gained))};
  }).filter(row => row.name).sort((a, b) => (b.hasGained ? b.gained : -Infinity) - (a.hasGained ? a.gained : -Infinity)).slice(0, 3);
  if (!sorted.length) { const empty = document.createElement("div"); empty.className = "event-detail-empty"; empty.textContent = "No standings yet."; return empty; }
  const list = document.createElement("div"); list.className = "standings";
  sorted.forEach((row, index) => {
    const item = document.createElement("div"); item.className = "standing-row";
    const rank = document.createElement("span"); rank.className = "standing-place"; rank.textContent = `${index + 1}.`;
    const name = document.createElement("span"); name.className = "standing-name"; name.textContent = row.name;
    const gain = document.createElement("span"); gain.className = "standing-gain"; gain.textContent = row.hasGained ? `+${new Intl.NumberFormat().format(row.gained)}` : "—";
    item.append(rank, name, gain); list.append(item);
  });
  return list;
}
function makeEventCard(event, ongoing) {
  const card = document.createElement("article"); card.className = "event-card"; card.dataset.id = event.id;
  const topline = document.createElement("div"); topline.className = "event-topline";
  const title = document.createElement("span"); title.className = "event-title"; title.textContent = event.title || "Untitled competition";
  const state = document.createElement("span"); state.className = "event-state" + (ongoing ? " live" : ""); state.textContent = ongoing ? "ONGOING" : "UPCOMING";
  topline.append(title, state);
  const date = document.createElement("div"); date.className = "event-date"; date.textContent = ongoing ? `Ends ${formatDate(event.endsAt)}` : `Starts ${formatDate(event.startsAt)}`;
  const details = document.createElement("div"); details.className = "event-details";
  const head = document.createElement("div"); head.className = "event-details-head";
  const schedule = document.createElement("span"); schedule.textContent = `${formatDate(event.startsAt)} — ${formatDate(event.endsAt)}`;
  const viewLink = document.createElement("a"); viewLink.href = `https://wiseoldman.net/competitions/${encodeURIComponent(event.id)}`; viewLink.target = "_blank"; viewLink.rel = "noopener"; viewLink.textContent = "Open ↗"; viewLink.addEventListener("click", event => event.stopPropagation());
  head.append(schedule, viewLink);
  details.append(head, renderStanding(event.participations));
  card.append(topline, date, details);
  card.addEventListener("click", () => {
    const wasSelected = card.classList.contains("selected");
    document.querySelectorAll(".event-card.selected").forEach(item => item.classList.remove("selected"));
    if (wasSelected) { selectedCompetition = null; byId("delete-dock").hidden = true; return; }
    card.classList.add("selected"); selectedCompetition = event;
    byId("selected-title").textContent = event.title || "Selected competition";
    byId("delete-dock").hidden = false;
  });
  return card;
}
async function refreshEvents() {
  if (!requireGroupAndCode()) return;
  const refreshButton = byId("refresh-events"); refreshButton.disabled = true; refreshButton.innerHTML = "↻ <span>Loading events…</span>";
  byId("upcoming-list").replaceChildren(); byId("ongoing-list").replaceChildren();
  byId("delete-dock").hidden = true; selectedCompetition = null;
  setStatus(byId("events-status"), "Loading upcoming and ongoing competitions…");
  try {
    const list = await api(`/groups/${encodeURIComponent(settings.groupId)}/competitions?limit=50`);
    const now = Date.now();
    const active = (Array.isArray(list) ? list : []).filter(item => item.id && new Date(item.endsAt).getTime() > now);
    active.sort((a, b) => {
      const aStart = new Date(a.startsAt).getTime(), bStart = new Date(b.startsAt).getTime();
      const aUpcoming = aStart > now, bUpcoming = bStart > now;
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
      return aUpcoming ? aStart - bStart : new Date(a.endsAt) - new Date(b.endsAt);
    });
    const selected = active.slice(0, 5);
    for (const event of selected) {
      try {
        const details = await api(`/competitions/${encodeURIComponent(event.id)}`);
        event.participations = details.participations || [];
        event.title = details.title || event.title;
        event.startsAt = details.startsAt || event.startsAt;
        event.endsAt = details.endsAt || event.endsAt;
      } catch (error) { event.participations = []; event.detailError = error.message; }
    }
    const upcoming = selected.filter(event => new Date(event.startsAt).getTime() > Date.now());
    const ongoing = selected.filter(event => new Date(event.startsAt).getTime() <= Date.now());
    if (upcoming.length) upcoming.forEach(event => byId("upcoming-list").append(makeEventCard(event, false)));
    else byId("upcoming-list").innerHTML = '<div class="empty-state">No upcoming competitions.</div>';
    if (ongoing.length) ongoing.forEach(event => byId("ongoing-list").append(makeEventCard(event, true)));
    else byId("ongoing-list").innerHTML = '<div class="empty-state">No competitions currently ongoing.</div>';
    byId("upcoming-count").textContent = String(upcoming.length); byId("ongoing-count").textContent = String(ongoing.length);
    setStatus(byId("events-status"), active.length > 5 ? `Showing the next five active competitions of ${active.length}.` : `${active.length} active competition${active.length === 1 ? "" : "s"} loaded.`, "success");
  } catch (error) {
    byId("upcoming-list").innerHTML = '<div class="empty-state">Could not load upcoming competitions.</div>';
    byId("ongoing-list").innerHTML = '<div class="empty-state">Could not load ongoing competitions.</div>';
    setStatus(byId("events-status"), `Could not load competitions: ${error.message}`, "error");
  } finally { refreshButton.disabled = false; refreshButton.innerHTML = "↻ <span>Refresh events</span>"; }
}
byId("refresh-events").addEventListener("click", refreshEvents);
byId("update-all").addEventListener("click", async () => {
  if (!requireGroupAndCode()) return;
  const button = byId("update-all"); button.disabled = true; button.innerHTML = "⇧ <span>Requesting updates…</span>";
  setStatus(byId("events-status"), "Requesting a Wise Old Man update for group members…");
  try {
    const response = await postJson(`/groups/${encodeURIComponent(settings.groupId)}/update-all`, {verificationCode: settings.verification});
    setStatus(byId("events-status"), response.message || "Wise Old Man accepted the member update request. Refreshing standings…", "success");
    await refreshEvents();
  } catch (error) { setStatus(byId("events-status"), `Could not update members: ${error.message}`, "error"); }
  finally { button.disabled = false; button.innerHTML = "⇧ <span>Update members + standings</span>"; }
});
byId("delete-event").addEventListener("click", async () => {
  if (!selectedCompetition || !requireGroupAndCode()) return;
  const event = selectedCompetition;
  const confirmed = await askConfirmation("Delete this competition?", `Permanently delete “${event.title}” from Wise Old Man? This cannot be undone.`, "Delete competition", true);
  if (!confirmed) return;
  byId("delete-event").disabled = true; setStatus(byId("events-status"), `Deleting ${event.title}…`);
  try {
    await postJson(`/competitions/${encodeURIComponent(event.id)}`, {verificationCode: settings.verification}, "DELETE");
    setStatus(byId("events-status"), `Deleted “${event.title}”. Refreshing events…`, "success");
    await refreshEvents();
  } catch (error) { setStatus(byId("events-status"), `Could not delete the competition: ${error.message}`, "error"); }
  finally { byId("delete-event").disabled = false; }
});

// Bingo board builder and three-team assignment
const BINGO_STORE_KEY = "womBingoBoards";
const BINGO_SKILL_KEY = "womBingoSkillRatings";
const cloneBingoData = value => JSON.parse(JSON.stringify(value));
function readBingoSkillRatings() {
  try {
    const saved = JSON.parse(localStorage.getItem(BINGO_SKILL_KEY) || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch { return {}; }
}
function bingoPlayerSkill(member) {
  const value = Number(bingoSkillRatings[String(member.username).trim().toLocaleLowerCase()]);
  return Number.isInteger(value) ? Math.min(10, Math.max(1, value)) : 5;
}
function emptyBingoBoard() {
  return {id: null, title: "Clan Bingo", size: "small", cells: Array(25).fill(null), customTiles: [], teams: [{name: "Team 1", members: []}, {name: "Team 2", members: []}, {name: "Team 3", members: []}]};
}
const bingoDimensions = {small: 5, large: 7};
function bingoBoardSize(board = {}) {
  if (board.size === "medium") return "large";
  if (Object.hasOwn(bingoDimensions, board.size)) return board.size;
  if (board.cells?.length === 25) return "small";
  return "large";
}
function bingoFreeIndex(size) { const dimension = bingoDimensions[size] || bingoDimensions.small; return (dimension * dimension - 1) / 2; }
function normalizeBingoBoard(board = {}) {
  const cells = Array.isArray(board.cells) ? board.cells : [];
  const size = bingoBoardSize({...board, cells});
  const dimension = bingoDimensions[size];
  const boardCells = Array(dimension * dimension).fill(null);
  if (cells.length === 36 && !Object.hasOwn(bingoDimensions, board.size)) {
    const freeIndex = bingoFreeIndex(size);
    cells.forEach((cell, index) => { const target = index >= freeIndex ? index + 1 : index; if (target < boardCells.length) boardCells[target] = cell; });
  } else cells.slice(0, boardCells.length).forEach((cell, index) => { boardCells[index] = cell; });
  const customTiles = Array.isArray(board.customTiles) ? board.customTiles : [];
  const sourceTeams = Array.isArray(board.teams) ? board.teams : [];
  return {
    id: board.id || null,
    title: String(board.title || "Clan Bingo").slice(0, 60),
    size,
    cells: Array.from({length: boardCells.length}, (_, index) => {
      if (index === bingoFreeIndex(size)) return null;
      const cell = boardCells[index];
      return cell && typeof cell === "object" && cell.id ? {id: String(cell.id), name: String(cell.name || pretty(cell.id))} : null;
    }),
    customTiles: customTiles.filter(tile => tile && typeof tile === "object" && tile.id && String(tile.id).startsWith("custom-") && String(tile.name || "").trim()).map(tile => ({id: String(tile.id), name: String(tile.name).slice(0, 32)})),
    teams: Array.from({length: 3}, (_, index) => {
      const team = sourceTeams[index] || {};
      const members = Array.isArray(team.members) ? team.members : [];
      return {name: String(team.name || `Team ${index + 1}`).slice(0, 30), members: members.filter(member => member && member.username).map(member => ({username: String(member.username), displayName: String(member.displayName || member.username)}))};
    })
  };
}
function readBingoState() {
  try {
    const saved = JSON.parse(localStorage.getItem(BINGO_STORE_KEY) || "{}");
    return {boards: Array.isArray(saved.boards) ? saved.boards.map(normalizeBingoBoard) : [], draft: normalizeBingoBoard(saved.draft || emptyBingoBoard()), dirty: Boolean(saved.dirty), selectedId: saved.selectedId || null};
  } catch { return {boards: [], draft: emptyBingoBoard(), dirty: false, selectedId: null}; }
}
let bingoState = readBingoState();
let bingoDraft = normalizeBingoBoard(bingoState.draft);
let bingoDirty = bingoState.dirty;
let bingoSkillRatings = readBingoSkillRatings();
let bingoRandomizerUndo = null;
let selectedBingoMonster = null;
let selectedBingoCell = null;
let bingoRoster = [];
let bingoRosterGroupId = null;
let selectedBingoMember = null;
let editingBingoMember = null;
const supportsBingoDrag = matchMedia("(pointer: fine)").matches;
const bingoMonsterById = new Map(bosses.map(id => [id, {id, name: pretty(id)}]));
function persistBingoDraft() {
  bingoState.draft = cloneBingoData(bingoDraft); bingoState.dirty = bingoDirty;
  try { localStorage.setItem(BINGO_STORE_KEY, JSON.stringify(bingoState)); }
  catch { setStatus(byId("bingo-status"), "Could not save this board in browser storage. Export it to keep a copy.", "error"); }
}
function clearBingoRandomizerUndo() {
  if (!bingoRandomizerUndo) return;
  bingoRandomizerUndo = null;
  byId("randomize-bingo").textContent = "Randomize";
}
function setBingoHint(message) { byId("bingo-board-hint").textContent = message; }
function fitBingoCellLabels() {
  byId("bingo-board").querySelectorAll(".bingo-cell-name").forEach(label => {
    const cell = label.closest(".bingo-cell");
    const style = getComputedStyle(cell);
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const availableHeight = Math.max(8, cell.clientHeight - padding - 12);
    const largest = Math.min(14, Math.max(9, cell.clientWidth * 0.2));
    for (let size = largest; size >= 6.5; size -= 0.5) {
      label.style.fontSize = `${size}px`;
      label.style.lineHeight = `${Math.ceil(size * 1.08)}px`;
      if (label.scrollHeight <= availableHeight + 1 && label.scrollWidth <= label.clientWidth + 1) break;
    }
  });
}
function renderBingoBoard() {
  const board = byId("bingo-board"); board.replaceChildren();
  const dimension = bingoDimensions[bingoDraft.size] || bingoDimensions.small;
  const freeIndex = bingoFreeIndex(bingoDraft.size);
  board.style.gridTemplateColumns = `repeat(${dimension}, minmax(0, 1fr))`;
  board.dataset.size = bingoDraft.size;
  byId("bingo-size").value = bingoDraft.size;
  byId("bingo-square-count").textContent = `${dimension} × ${dimension} · ${dimension * dimension} SQUARES`;
  bingoDraft.cells.forEach((item, index) => {
    const cell = document.createElement("button"); cell.type = "button"; cell.className = "bingo-cell" + (selectedBingoCell === index ? " selected" : "") + (item ? " filled" : "");
    cell.setAttribute("aria-label", item ? `Square ${index + 1}: ${item.name}` : `Empty square ${index + 1}`);
    if (item) cell.title = item.name;
    if (index === freeIndex) {
      cell.classList.add("free-space"); cell.disabled = true; cell.draggable = false; cell.setAttribute("aria-label", "Free space");
      const label = document.createElement("span"); label.className = "bingo-free-label"; label.textContent = "FREE SPACE"; cell.append(label); board.append(cell); return;
    }
    cell.dataset.index = String(index); cell.draggable = Boolean(item) && supportsBingoDrag;
    const number = document.createElement("span"); number.className = "bingo-cell-number"; number.textContent = String(index + 1).padStart(2, "0"); cell.append(number);
    if (item) { const name = document.createElement("span"); name.className = "bingo-cell-name"; name.textContent = item.name; cell.append(name); }
    cell.addEventListener("click", () => {
      if (selectedBingoMonster) {
        const monster = bingoTileById(selectedBingoMonster);
        clearBingoRandomizerUndo();
        bingoDraft.cells[index] = {id: monster.id, name: monster.name};
        selectedBingoMonster = null; selectedBingoCell = null; bingoDirty = true; persistBingoDraft(); renderBingoBoard(); renderBingoCatalog(); setBingoHint(`${monster.name} placed. Tap another tile to place it, or move a tile by tapping its square and then another square.`); return;
      }
      if (selectedBingoCell !== null) {
        if (selectedBingoCell !== index) { clearBingoRandomizerUndo(); [bingoDraft.cells[index], bingoDraft.cells[selectedBingoCell]] = [bingoDraft.cells[selectedBingoCell], bingoDraft.cells[index]]; }
        selectedBingoCell = null; bingoDirty = true; persistBingoDraft(); renderBingoBoard(); return;
      }
      if (item) { selectedBingoCell = index; renderBingoBoard(); setBingoHint(`${item.name} selected. Tap another square to move it, or remove the selection.`); }
    });
    cell.addEventListener("dragstart", event => {
      if (!item) return;
      event.dataTransfer.setData("application/x-bingo-cell", String(index)); event.dataTransfer.effectAllowed = "move";
    });
    cell.addEventListener("dragover", event => event.preventDefault());
    cell.addEventListener("drop", event => {
      event.preventDefault();
      const monsterId = event.dataTransfer.getData("application/x-bingo-monster");
      const sourceIndex = event.dataTransfer.getData("application/x-bingo-cell");
      if (monsterId && bingoTileById(monsterId)) { const monster = bingoTileById(monsterId); clearBingoRandomizerUndo(); bingoDraft.cells[index] = {id: monster.id, name: monster.name}; }
      else if (sourceIndex !== "" && Number(sourceIndex) !== index) { clearBingoRandomizerUndo(); [bingoDraft.cells[index], bingoDraft.cells[Number(sourceIndex)]] = [bingoDraft.cells[Number(sourceIndex)], bingoDraft.cells[index]]; }
      else return;
      selectedBingoMonster = null; selectedBingoCell = null; bingoDirty = true; persistBingoDraft(); renderBingoBoard(); renderBingoCatalog();
    });
    board.append(cell);
  });
  byId("bingo-title").value = bingoDraft.title;
  byId("remove-bingo-tile").disabled = selectedBingoCell === null;
  fitBingoCellLabels();
}
function renderBingoCatalog() {
  const list = byId("bingo-catalog"); const query = byId("bingo-search").value.trim().toLocaleLowerCase();
  const placed = new Set(bingoDraft.cells.filter(Boolean).map(tile => tile.id));
  const available = [...bosses.map(id => bingoMonsterById.get(id)), ...bingoDraft.customTiles].filter(tile => !placed.has(tile.id));
  const choices = available.filter(tile => tile.name.toLocaleLowerCase().includes(query));
  list.replaceChildren();
  if (!choices.length) {
    const empty = document.createElement("div"); empty.className = "empty-state";
    empty.textContent = available.length ? "No tiles match that search." : "All tiles are on the board. Clear a square to add one back.";
    list.append(empty); return;
  }
  choices.forEach(monster => {
    const option = document.createElement("button"); option.type = "button"; option.className = "bingo-monster" + (selectedBingoMonster === monster.id ? " selected" : "") + (monster.id.startsWith("custom-") ? " custom" : ""); option.draggable = supportsBingoDrag;
    const label = document.createElement("span"); label.textContent = monster.name; option.append(label);
    option.addEventListener("click", () => { selectedBingoMonster = selectedBingoMonster === monster.id ? null : monster.id; selectedBingoCell = null; renderBingoCatalog(); setBingoHint(selectedBingoMonster ? `${monster.name} selected. Tap a square to place it.` : "Tap a monster to select it, then tap a square to place it. You can also drag tiles on desktop."); });
    option.addEventListener("dragstart", event => { event.dataTransfer.setData("application/x-bingo-monster", monster.id); event.dataTransfer.effectAllowed = "copy"; });
    list.append(option);
  });
}
function bingoTileById(id) { return bingoMonsterById.get(id) || bingoDraft.customTiles.find(tile => tile.id === id) || null; }
function renderSavedBingoBoards() {
  const select = byId("saved-boards"); const selected = bingoDraft.id || ""; select.replaceChildren(new Option("Choose a saved board", ""));
  bingoState.boards.forEach(board => select.add(new Option(board.title, board.id)));
  select.value = bingoState.boards.some(board => board.id === selected) ? selected : "";
  byId("delete-bingo").disabled = !select.value;
}
function renderBingoTeams() {
  const assigned = new Set(bingoDraft.teams.flatMap(team => team.members.map(member => member.username)));
  const query = byId("bingo-member-search").value.trim().toLocaleLowerCase();
  const unassigned = bingoRoster.filter(member => !assigned.has(member.username) && member.displayName.toLocaleLowerCase().includes(query));
  const rosterBox = byId("bingo-unassigned"); rosterBox.replaceChildren();
  if (!bingoRoster.length) { const empty = document.createElement("div"); empty.className = "empty-state"; empty.textContent = settings.groupId ? "Refresh to load your group members." : "Choose a Wise Old Man group in Configuration first."; rosterBox.append(empty); }
  else if (!unassigned.length) { const empty = document.createElement("div"); empty.className = "empty-state"; empty.textContent = query ? "No unassigned members match that search." : "Everyone is assigned to a team."; rosterBox.append(empty); }
  unassigned.forEach(member => rosterBox.append(makeBingoMemberButton(member, false)));
  const columns = byId("bingo-team-columns"); columns.replaceChildren();
  bingoDraft.teams.forEach((team, teamIndex) => {
    const card = document.createElement("article"); card.className = "surface bingo-team-card";
    const header = document.createElement("div"); header.className = "bingo-team-heading";
    const name = document.createElement("input"); name.className = "bingo-team-name"; name.value = team.name; name.maxLength = 30; name.setAttribute("aria-label", `Team ${teamIndex + 1} name`);
    name.addEventListener("input", () => { team.name = name.value.slice(0, 30) || `Team ${teamIndex + 1}`; bingoDirty = true; persistBingoDraft(); });
    const count = document.createElement("span"); count.className = "count-pill"; count.textContent = String(team.members.length); header.append(name, count);
    const clear = document.createElement("button"); clear.type = "button"; clear.className = "bingo-clear-team"; clear.textContent = "×"; clear.disabled = team.members.length === 0; clear.title = `Clear ${team.name}`; clear.setAttribute("aria-label", `Clear all members from ${team.name}`);
    clear.addEventListener("click", () => clearBingoTeam(teamIndex)); header.append(clear);
    const drop = document.createElement("div"); drop.className = "bingo-team-drop"; drop.dataset.team = String(teamIndex); drop.setAttribute("aria-label", `Drop zone for ${team.name}`);
    if (!team.members.length) { const empty = document.createElement("div"); empty.className = "bingo-team-empty"; empty.textContent = "Drop members here"; drop.append(empty); }
    team.members.forEach(member => drop.append(makeBingoMemberButton(member, true, teamIndex)));
    drop.addEventListener("dragover", event => event.preventDefault());
    drop.addEventListener("drop", event => { event.preventDefault(); const username = event.dataTransfer.getData("application/x-bingo-member"); const member = bingoRoster.find(player => player.username === username) || bingoDraft.teams.flatMap(group => group.members).find(player => player.username === username); if (member) assignBingoMember(member, teamIndex); });
    drop.addEventListener("click", event => { if (event.target === drop || event.target.classList.contains("bingo-team-empty")) { if (selectedBingoMember) assignBingoMember(selectedBingoMember, teamIndex); } });
    card.append(header, drop); columns.append(card);
  });
}
async function clearBingoTeam(teamIndex) {
  const team = bingoDraft.teams[teamIndex];
  if (!team?.members.length) return;
  if (!await askConfirmation(`Clear ${team.name}?`, `Remove all ${team.members.length} members from this team?`, "Clear team", true)) return;
  team.members = []; selectedBingoMember = null; bingoDirty = true; persistBingoDraft(); renderBingoTeams();
  setStatus(byId("bingo-status"), `${team.name} was cleared. Members are back in the available list.`, "success");
}
async function clearAllBingoTeams() {
  const count = bingoDraft.teams.reduce((sum, team) => sum + team.members.length, 0);
  if (!count) { setStatus(byId("bingo-status"), "No team assignments to clear."); return; }
  if (!await askConfirmation("Clear all teams?", `Remove all ${count} assigned members from the three teams?`, "Clear all teams", true)) return;
  bingoDraft.teams.forEach(team => { team.members = []; }); selectedBingoMember = null; bingoDirty = true; persistBingoDraft(); renderBingoTeams();
  setStatus(byId("bingo-status"), "All teams were cleared. Members are back in the available list.", "success");
}
function openBingoSkillDialog(member) {
  editingBingoMember = member;
  byId("member-skill-title").textContent = member.displayName;
  byId("member-skill-range").value = String(bingoPlayerSkill(member));
  byId("member-skill-value").textContent = `${byId("member-skill-range").value} / 10`;
  byId("member-skill-dialog").showModal();
}
function saveBingoSkill(selectForTeam) {
  if (!editingBingoMember) return;
  const key = String(editingBingoMember.username).trim().toLocaleLowerCase();
  bingoSkillRatings[key] = Number(byId("member-skill-range").value);
  try { localStorage.setItem(BINGO_SKILL_KEY, JSON.stringify(bingoSkillRatings)); }
  catch { setStatus(byId("bingo-status"), "Could not save skill ratings in this browser.", "error"); return; }
  const member = editingBingoMember;
  selectedBingoMember = selectForTeam ? member : null;
  byId("member-skill-dialog").close(); editingBingoMember = null; renderBingoTeams();
  setStatus(byId("bingo-status"), selectForTeam ? `${member.displayName} rated ${bingoPlayerSkill(member)}/10 and selected. Tap a team to place them.` : `${member.displayName} rated ${bingoPlayerSkill(member)}/10.`, "success");
}
function makeBingoMemberButton(member, assigned, teamIndex = -1) {
  const chip = document.createElement("div"); chip.className = "bingo-member" + (selectedBingoMember?.username === member.username ? " selected" : ""); chip.draggable = supportsBingoDrag;
  chip.setAttribute("role", "group"); chip.setAttribute("aria-label", `${member.displayName}, skill ${bingoPlayerSkill(member)} out of 10${assigned ? `, assigned to ${bingoDraft.teams[teamIndex].name}` : ", unassigned"}`);
  const name = document.createElement("button"); name.type = "button"; name.className = "bingo-member-name"; name.textContent = member.displayName; name.title = assigned ? "Tap to select for another team; tap again to unassign" : "Tap to select, then choose a team";
  name.addEventListener("click", event => {
    event.stopPropagation();
    if (assigned && selectedBingoMember?.username === member.username) { assignBingoMember(member, null); return; }
    selectedBingoMember = selectedBingoMember?.username === member.username ? null : member; renderBingoTeams();
    if (selectedBingoMember) setStatus(byId("bingo-status"), `${member.displayName} selected. Tap a team to place them.`);
  });
  const rating = document.createElement("button"); rating.type = "button"; rating.className = "bingo-skill-rating"; rating.textContent = `${bingoPlayerSkill(member)}/10`; rating.title = `Tap ${bingoPlayerSkill(member)}/10 to set ${member.displayName}'s skill rating`;
  rating.setAttribute("aria-label", `Set ${member.displayName}'s skill rating, ${bingoPlayerSkill(member)} out of 10`);
  rating.addEventListener("click", event => { event.stopPropagation(); openBingoSkillDialog(member); });
  chip.append(name, rating);
  chip.addEventListener("dragstart", event => { event.dataTransfer.setData("application/x-bingo-member", member.username); event.dataTransfer.effectAllowed = "move"; });
  if (assigned) {
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "bingo-member-team-label"; remove.textContent = "×"; remove.setAttribute("aria-label", `Remove ${member.displayName} from ${bingoDraft.teams[teamIndex].name}`);
    remove.addEventListener("click", event => { event.stopPropagation(); assignBingoMember(member, null); }); chip.append(remove);
  }
  return chip;
}
function assignBingoMember(member, teamIndex) {
  bingoDraft.teams.forEach(team => { team.members = team.members.filter(player => player.username !== member.username); });
  if (teamIndex !== null && teamIndex !== undefined) bingoDraft.teams[teamIndex].members.push({username: member.username, displayName: member.displayName});
  selectedBingoMember = null; bingoDirty = true; persistBingoDraft(); renderBingoTeams();
  setStatus(byId("bingo-status"), teamIndex === null ? `${member.displayName} moved to the unassigned list.` : `${member.displayName} added to ${bingoDraft.teams[teamIndex].name}.`, "success");
}
function setBingoMode(mode) {
  const teams = mode === "teams";
  byId("bingo-board-mode").classList.toggle("active", !teams); byId("bingo-teams-mode").classList.toggle("active", teams);
  byId("bingo-board-mode").setAttribute("aria-selected", String(!teams)); byId("bingo-teams-mode").setAttribute("aria-selected", String(teams));
  byId("bingo-board-panel").classList.toggle("active", !teams); byId("bingo-teams-panel").classList.toggle("active", teams);
  if (teams && (!bingoRoster.length || bingoRosterGroupId !== settings.groupId)) loadBingoRoster();
}
async function loadBingoRoster() {
  if (!settings.groupId) { bingoRoster = []; bingoRosterGroupId = null; renderBingoTeams(); setStatus(byId("bingo-status"), "Choose your Wise Old Man group in Configuration to load members."); return; }
  const refresh = byId("refresh-bingo-roster"); refresh.disabled = true; refresh.innerHTML = "↻ <span>Loading…</span>";
  byId("bingo-roster-note").textContent = "Loading members from Wise Old Man…";
  try {
    const group = await api(`/groups/${encodeURIComponent(settings.groupId)}`);
    bingoRoster = (group.memberships || []).map(membership => {
      const player = membership.player || {}; const username = player.username || player.displayName; const displayName = player.displayName || player.username;
      return username && displayName ? {username, displayName} : null;
    }).filter(Boolean).sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, {sensitivity: "base"}));
    bingoRosterGroupId = settings.groupId; byId("bingo-roster-note").textContent = `${bingoRoster.length} members loaded. Tap a name to select them for a team. Tap the separate skill score button to change their rating.`;
    renderBingoTeams(); setStatus(byId("bingo-status"), `Loaded ${bingoRoster.length} Wise Old Man members.`, "success");
  } catch (error) { byId("bingo-roster-note").textContent = `Could not load group members: ${error.message}`; setStatus(byId("bingo-status"), `Could not load members: ${error.message}`, "error"); }
  finally { refresh.disabled = false; refresh.innerHTML = "↻ <span>Refresh</span>"; }
}
byId("bingo-board-mode").addEventListener("click", () => setBingoMode("board"));
byId("bingo-teams-mode").addEventListener("click", () => setBingoMode("teams"));
byId("bingo-search").addEventListener("input", renderBingoCatalog);
byId("bingo-member-search").addEventListener("input", renderBingoTeams);
byId("refresh-bingo-roster").addEventListener("click", loadBingoRoster);
byId("clear-all-teams").addEventListener("click", clearAllBingoTeams);
byId("member-skill-range").addEventListener("input", () => { byId("member-skill-value").textContent = `${byId("member-skill-range").value} / 10`; });
byId("member-skill-close").addEventListener("click", () => byId("member-skill-dialog").close());
byId("save-skill-rating").addEventListener("click", () => saveBingoSkill(false));
byId("select-rated-member").addEventListener("click", () => saveBingoSkill(true));
byId("balance-bingo-teams").addEventListener("click", async () => {
  if (!settings.groupId) { setStatus(byId("bingo-status"), "Choose your Wise Old Man group in Configuration before balancing teams.", "error"); return; }
  const button = byId("balance-bingo-teams"); button.disabled = true; button.textContent = "Loading members…";
  if (!bingoRoster.length || bingoRosterGroupId !== settings.groupId) await loadBingoRoster();
  if (!bingoRoster.length || bingoRosterGroupId !== settings.groupId) { button.disabled = false; button.textContent = "⚖ Auto-balance teams"; return; }
  const shuffled = [...bingoRoster];
  for (let index = shuffled.length - 1; index > 0; index--) { const target = Math.floor(Math.random() * (index + 1)); [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]; }
  shuffled.sort((a, b) => bingoPlayerSkill(b) - bingoPlayerSkill(a));
  const totals = [0, 0, 0]; const teams = bingoDraft.teams;
  teams.forEach(team => { team.members = []; });
  shuffled.forEach(member => {
    const smallestTeam = Math.min(...teams.map(team => team.members.length));
    const candidates = teams.map((team, index) => ({team, index})).filter(item => item.team.members.length === smallestTeam);
    const lowestRating = Math.min(...candidates.map(item => totals[item.index]));
    const best = candidates.filter(item => totals[item.index] === lowestRating);
    const chosen = best[Math.floor(Math.random() * best.length)];
    chosen.team.members.push({username: member.username, displayName: member.displayName});
    totals[chosen.index] += bingoPlayerSkill(member);
  });
  selectedBingoMember = null; bingoDirty = true; persistBingoDraft(); renderBingoTeams();
  const scoreSummary = totals.map((score, index) => `${teams[index].name}: ${score}`).join(" · ");
  setStatus(byId("bingo-status"), `Balanced ${shuffled.length} players by skill. Team totals — ${scoreSummary}.`, "success");
  button.disabled = false; button.textContent = "⚖ Auto-balance teams";
});
byId("bingo-title").addEventListener("input", () => { bingoDraft.title = byId("bingo-title").value.slice(0, 60); bingoDirty = true; persistBingoDraft(); });
byId("bingo-size").addEventListener("change", async () => {
  const nextSize = byId("bingo-size").value;
  const oldSize = bingoDraft.size;
  if (!Object.hasOwn(bingoDimensions, nextSize) || nextSize === oldSize) { renderBingoBoard(); return; }
  const oldDimension = bingoDimensions[oldSize]; const nextDimension = bingoDimensions[nextSize];
  const oldFreeIndex = bingoFreeIndex(oldSize); const nextFreeIndex = bingoFreeIndex(nextSize);
  const nextCells = Array(nextDimension * nextDimension).fill(null);
  let overflow = 0;
  bingoDraft.cells.forEach((tile, index) => {
    if (!tile || index === oldFreeIndex) return;
    const row = Math.floor(index / oldDimension); const column = index % oldDimension;
    const targetRow = nextSize === "large" ? row + Math.floor((nextDimension - oldDimension) / 2) : row - Math.floor((oldDimension - nextDimension) / 2);
    const targetColumn = nextSize === "large" ? column + Math.floor((nextDimension - oldDimension) / 2) : column - Math.floor((oldDimension - nextDimension) / 2);
    if (targetRow < 0 || targetColumn < 0 || targetRow >= nextDimension || targetColumn >= nextDimension) { overflow++; return; }
    const target = targetRow * nextDimension + targetColumn;
    if (target === nextFreeIndex) { overflow++; return; }
    nextCells[target] = tile;
  });
  if (overflow && !await askConfirmation("Resize to 5 × 5?", `${overflow} tile${overflow === 1 ? " is" : "s are"} outside the smaller board and will be removed.`, "Resize board", true)) { byId("bingo-size").value = oldSize; return; }
  clearBingoRandomizerUndo();
  bingoDraft.size = nextSize; bingoDraft.cells = nextCells; selectedBingoCell = null; selectedBingoMonster = null; bingoDirty = true;
  persistBingoDraft(); renderBingoBoard(); renderBingoCatalog(); setBingoHint(`Board resized to ${nextDimension} × ${nextDimension}. The center square is reserved for Free Space.`);
});
byId("remove-bingo-tile").addEventListener("click", () => {
  if (selectedBingoCell === null) return;
  clearBingoRandomizerUndo();
  bingoDraft.cells[selectedBingoCell] = null; selectedBingoCell = null; bingoDirty = true; persistBingoDraft(); renderBingoBoard(); renderBingoCatalog(); setBingoHint("Square cleared. Choose a monster to fill it.");
});
byId("clear-bingo").addEventListener("click", async () => {
  if (!bingoDraft.cells.some(Boolean)) return;
  if (!await askConfirmation("Clear the bingo board?", "This removes every tile from the current draft.", "Clear board", true)) return;
  clearBingoRandomizerUndo();
  bingoDraft.cells = Array(bingoDimensions[bingoDraft.size] ** 2).fill(null); selectedBingoCell = null; selectedBingoMonster = null; bingoDirty = true; persistBingoDraft(); renderBingoBoard(); renderBingoCatalog(); setBingoHint("Board cleared. Choose a monster, then tap a square or drag it onto the board.");
});
byId("randomize-bingo").addEventListener("click", async () => {
  if (bingoRandomizerUndo) {
    bingoDraft.size = bingoRandomizerUndo.size; bingoDraft.cells = bingoRandomizerUndo.cells; bingoRandomizerUndo = null;
    byId("randomize-bingo").textContent = "Randomize"; selectedBingoCell = null; selectedBingoMonster = null; bingoDirty = true;
    persistBingoDraft(); renderBingoBoard(); renderBingoCatalog();
    setBingoHint("Restored the board from before the last random fill.");
    setStatus(byId("bingo-status"), "Undid the last random board fill.", "success");
    return;
  }
  if (bingoDraft.cells.some(Boolean) && !await askConfirmation("Randomize the bingo board?", "This replaces the current tiles with a fresh random set.", "Randomize board")) return;
  const dimension = bingoDimensions[bingoDraft.size]; const freeIndex = bingoFreeIndex(bingoDraft.size); const required = dimension * dimension - 1;
  const pool = [...bosses.map(id => bingoMonsterById.get(id)), ...bingoDraft.customTiles];
  for (let index = pool.length - 1; index > 0; index--) { const target = Math.floor(Math.random() * (index + 1)); [pool[index], pool[target]] = [pool[target], pool[index]]; }
  bingoRandomizerUndo = {size: bingoDraft.size, cells: cloneBingoData(bingoDraft.cells)};
  byId("randomize-bingo").textContent = "Undo randomize";
  bingoDraft.cells = Array(dimension * dimension).fill(null); let poolIndex = 0;
  bingoDraft.cells.forEach((_, index) => { if (index !== freeIndex && poolIndex < pool.length) { const tile = pool[poolIndex++]; bingoDraft.cells[index] = {id: tile.id, name: tile.name}; } });
  selectedBingoCell = null; selectedBingoMonster = null; bingoDirty = true; persistBingoDraft(); renderBingoBoard(); renderBingoCatalog();
  const placed = Math.min(required, pool.length);
  setBingoHint(`Randomized board with ${placed} unique tile${placed === 1 ? "" : "s"}. The center square is Free Space.`);
  setStatus(byId("bingo-status"), `Added ${placed} random tiles to the ${dimension} × ${dimension} board.`, "success");
});
byId("new-bingo").addEventListener("click", async () => {
  if (bingoDirty && !await askConfirmation("Start a new board?", "Your unsaved draft will be replaced. Export it first if you want a separate copy.", "Start new board")) return;
  clearBingoRandomizerUndo();
  bingoDraft = emptyBingoBoard(); bingoDirty = false; selectedBingoCell = null; selectedBingoMonster = null; selectedBingoMember = null;
  persistBingoDraft(); renderBingoBoard(); renderBingoCatalog(); renderSavedBingoBoards(); renderBingoTeams(); setBingoHint("Choose a monster, then tap a square, or drag it onto the board.");
});
byId("save-bingo").addEventListener("click", () => {
  clearBingoRandomizerUndo();
  bingoDraft.title = byId("bingo-title").value.trim() || "Clan Bingo";
  if (!bingoDraft.id) bingoDraft.id = `bingo-${Date.now().toString(36)}`;
  const saved = cloneBingoData(bingoDraft); const index = bingoState.boards.findIndex(board => board.id === saved.id);
  if (index < 0) bingoState.boards.push(saved); else bingoState.boards[index] = saved;
  bingoDirty = false; bingoState.selectedId = saved.id; persistBingoDraft(); renderSavedBingoBoards();
  setStatus(byId("bingo-status"), `“${saved.title}” saved on this device.`, "success"); toast("Bingo board saved.");
});
byId("saved-boards").addEventListener("change", async () => {
  const board = bingoState.boards.find(item => item.id === byId("saved-boards").value);
  if (!board) { byId("delete-bingo").disabled = true; return; }
  if (bingoDirty && !await askConfirmation("Open another board?", "Your unsaved draft will be replaced.", "Open board")) { renderSavedBingoBoards(); return; }
  clearBingoRandomizerUndo();
  bingoDraft = normalizeBingoBoard(board); bingoDirty = false; selectedBingoCell = null; selectedBingoMonster = null;
  persistBingoDraft(); renderSavedBingoBoards(); renderBingoBoard(); renderBingoCatalog(); renderBingoTeams(); setStatus(byId("bingo-status"), `Opened “${board.title}”.`);
});
byId("delete-bingo").addEventListener("click", async () => {
  const boardId = byId("saved-boards").value;
  const board = bingoState.boards.find(item => item.id === boardId);
  if (!board) return;
  if (!await askConfirmation("Delete saved board?", `“${board.title}” will be deleted from this browser.`, "Delete board", true)) return;
  clearBingoRandomizerUndo();
  bingoState.boards = bingoState.boards.filter(item => item.id !== boardId);
  bingoDraft = emptyBingoBoard(); bingoDirty = false; selectedBingoCell = null; selectedBingoMonster = null;
  persistBingoDraft(); renderSavedBingoBoards(); renderBingoBoard(); renderBingoCatalog(); renderBingoTeams();
  setStatus(byId("bingo-status"), `Deleted “${board.title}”.`, "success");
});
byId("export-bingo").addEventListener("click", () => {
  const data = {format: "wom-clan-manager-bingo", version: 1, board: normalizeBingoBoard({...bingoDraft, id: null})};
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"}); const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `${(bingoDraft.title || "clan-bingo").trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "clan-bingo"}.json`; link.click(); URL.revokeObjectURL(url);
  setStatus(byId("bingo-status"), "Board and team assignments exported as a JSON file.", "success");
});
function wrapBingoCanvasText(context, value, maxWidth) {
  const lines = [];
  String(value || "").split(/\s+/).filter(Boolean).forEach(word => {
    const chunks = [];
    let chunk = "";
    for (const character of word) {
      if (chunk && context.measureText(chunk + character).width > maxWidth) { chunks.push(chunk); chunk = ""; }
      chunk += character;
    }
    if (chunk) chunks.push(chunk);
    chunks.forEach(part => {
      const current = lines[lines.length - 1];
      if (!current || context.measureText(`${current} ${part}`).width > maxWidth) lines.push(part);
      else lines[lines.length - 1] = `${current} ${part}`;
    });
  });
  return lines.length ? lines : [""];
}
function roundedCanvasRect(context, x, y, width, height, radius, fill, stroke) {
  context.beginPath(); context.roundRect(x, y, width, height, radius);
  context.fillStyle = fill; context.fill();
  if (stroke) { context.strokeStyle = stroke; context.lineWidth = 2; context.stroke(); }
}
function renderBingoShareImage() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const width = 1600; const margin = 48; const headerHeight = 142; const boardCardWidth = 760; const gap = 20; const teamsX = margin + boardCardWidth + gap; const teamsWidth = width - margin - teamsX;
  const boardDimension = bingoDimensions[bingoDraft.size] || 5; const boardSize = 680; const cellSize = boardSize / boardDimension; const boardX = margin + (boardCardWidth - boardSize) / 2; const boardY = headerHeight + 70;
  const teamGap = 16; const teamWidth = (teamsWidth - teamGap * 2) / 3; const teamTextWidth = teamWidth - 36;
  const teamRows = bingoDraft.teams.map(team => {
    context.font = "600 17px 'DM Sans', 'Segoe UI', sans-serif";
    return team.members.map(member => {
      const lines = wrapBingoCanvasText(context, member.displayName || member.username, teamTextWidth - 30);
      return {lines, height: Math.max(42, lines.length * 23 + 16)};
    });
  });
  const teamCardHeights = teamRows.map(rows => 82 + rows.reduce((sum, row) => sum + row.height + 8, 0));
  const contentHeight = Math.max(760, ...teamCardHeights);
  canvas.width = width; canvas.height = headerHeight + contentHeight + 48;
  context.fillStyle = "#10131b"; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#b4a5ff"; context.font = "700 14px 'DM Sans', 'Segoe UI', sans-serif"; context.fillText("CLAN BINGO", margin, 46);
  context.fillStyle = "#f2f4f8"; context.font = "800 40px Manrope, 'Segoe UI', sans-serif"; context.fillText(bingoDraft.title || "Clan Bingo", margin, 96);
  context.fillStyle = "#a3adbd"; context.font = "500 17px 'DM Sans', 'Segoe UI', sans-serif"; context.fillText(`${boardDimension} × ${boardDimension} board  ·  ${bingoDraft.teams.reduce((sum, team) => sum + team.members.length, 0)} members assigned`, margin, 126);
  const panelY = headerHeight; const panelHeight = contentHeight;
  roundedCanvasRect(context, margin, panelY, boardCardWidth, panelHeight, 22, "#1a202d", "#303a4a");
  context.fillStyle = "#b4a5ff"; context.font = "700 13px 'DM Sans', 'Segoe UI', sans-serif"; context.fillText("BINGO BOARD", margin + 30, panelY + 40);
  context.fillStyle = "#a3adbd"; context.font = "500 15px 'DM Sans', 'Segoe UI', sans-serif"; context.fillText(`${boardDimension} × ${boardDimension}`, margin + 30, panelY + 66);
  const freeIndex = bingoFreeIndex(bingoDraft.size);
  bingoDraft.cells.forEach((tile, index) => {
    const row = Math.floor(index / boardDimension); const column = index % boardDimension; const x = boardX + column * cellSize; const y = boardY + row * cellSize; const free = index === freeIndex;
    const fill = free ? "#302a49" : tile ? "#222c3b" : "#121823"; const stroke = free ? "#8774d5" : tile ? "#38465a" : "#48536a";
    roundedCanvasRect(context, x + 3, y + 3, cellSize - 6, cellSize - 6, 10, fill, stroke);
    if (free) {
      context.fillStyle = "#e2d9ff"; context.font = "800 17px Manrope, 'Segoe UI', sans-serif"; context.textAlign = "center"; context.textBaseline = "middle";
      context.fillText("FREE SPACE", x + cellSize / 2, y + cellSize / 2); context.textAlign = "left"; context.textBaseline = "alphabetic"; return;
    }
    context.fillStyle = "#758299"; context.font = "700 11px 'DM Sans', 'Segoe UI', sans-serif"; context.fillText(String(index + 1).padStart(2, "0"), x + 10, y + 19);
    if (!tile) return;
    const maxTextWidth = cellSize - 20; const maxTextHeight = cellSize - 34; let fontSize = Math.min(19, cellSize * 0.18); let lines;
    do {
      context.font = `800 ${fontSize}px Manrope, 'Segoe UI', sans-serif`;
      lines = wrapBingoCanvasText(context, tile.name, maxTextWidth);
      if (lines.length * fontSize * 1.16 <= maxTextHeight || fontSize <= 8) break;
      fontSize -= 0.5;
    } while (fontSize > 7.5);
    context.font = `800 ${fontSize}px Manrope, 'Segoe UI', sans-serif`; context.fillStyle = "#f2f4f8"; context.textAlign = "center"; context.textBaseline = "middle";
    const lineHeight = fontSize * 1.16; const centerY = y + cellSize / 2 + 5; const totalHeight = lines.length * lineHeight;
    lines.forEach((line, lineIndex) => context.fillText(line, x + cellSize / 2, centerY - totalHeight / 2 + lineHeight * (lineIndex + 0.5), maxTextWidth));
    context.textAlign = "left"; context.textBaseline = "alphabetic";
  });
  bingoDraft.teams.forEach((team, teamIndex) => {
    const x = teamsX + teamIndex * (teamWidth + teamGap); const height = Math.max(panelHeight, teamCardHeights[teamIndex]);
    roundedCanvasRect(context, x, panelY, teamWidth, height, 18, "#1a202d", "#303a4a");
    context.fillStyle = "#b4a5ff"; context.font = "700 12px 'DM Sans', 'Segoe UI', sans-serif"; context.fillText(`TEAM ${teamIndex + 1}`, x + 18, panelY + 32);
    context.fillStyle = "#f2f4f8"; context.font = "800 22px Manrope, 'Segoe UI', sans-serif"; context.fillText(team.name || `Team ${teamIndex + 1}`, x + 18, panelY + 62, teamWidth - 36);
    context.fillStyle = "#a3adbd"; context.font = "500 13px 'DM Sans', 'Segoe UI', sans-serif"; context.fillText(`${team.members.length} members`, x + 18, panelY + 84);
    let y = panelY + 104;
    if (!team.members.length) { context.fillStyle = "#738095"; context.font = "500 14px 'DM Sans', 'Segoe UI', sans-serif"; context.fillText("No members assigned", x + 18, y + 16); return; }
    team.members.forEach((member, memberIndex) => {
      const row = teamRows[teamIndex][memberIndex]; roundedCanvasRect(context, x + 12, y, teamWidth - 24, row.height, 9, "#202737", "#303a4a");
      context.fillStyle = "#b4a5ff"; context.font = "800 12px 'DM Sans', 'Segoe UI', sans-serif"; context.fillText(String(memberIndex + 1).padStart(2, "0"), x + 22, y + 25);
      context.fillStyle = "#e8ebf2"; context.font = "600 17px 'DM Sans', 'Segoe UI', sans-serif";
      row.lines.forEach((line, lineIndex) => context.fillText(line, x + 52, y + 24 + lineIndex * 23, teamTextWidth - 20));
      y += row.height + 8;
    });
  });
  context.fillStyle = "#738095"; context.font = "500 12px 'DM Sans', 'Segoe UI', sans-serif"; context.textAlign = "right"; context.fillText("WoM Clan Manager · Made by Its Za", width - margin, canvas.height - 18); context.textAlign = "left";
  return canvas;
}
byId("export-bingo-png").addEventListener("click", async () => {
  const button = byId("export-bingo-png"); button.disabled = true; button.textContent = "Preparing…";
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const canvas = renderBingoShareImage();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not create the PNG image.");
    const filename = `${(bingoDraft.title || "clan-bingo").trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "clan-bingo"}.png`;
    const file = new File([blob], filename, {type: "image/png"});
    if (navigator.share && navigator.canShare?.({files: [file]})) await navigator.share({files: [file], title: bingoDraft.title || "Clan Bingo"});
    else { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    setStatus(byId("bingo-status"), "Bingo board and team lists exported as a PNG.", "success");
  } catch (error) {
    if (error.name !== "AbortError") setStatus(byId("bingo-status"), `Could not export PNG: ${error.message}`, "error");
  } finally { button.disabled = false; button.textContent = "Export PNG"; }
});
byId("import-bingo").addEventListener("click", () => byId("import-bingo-file").click());
byId("import-bingo-file").addEventListener("change", async () => {
  const file = byId("import-bingo-file").files?.[0]; if (!file) return;
  try {
    const imported = JSON.parse(await file.text()); const board = imported.board || imported;
    if (!Array.isArray(board.cells) || ![25, 36, 49].includes(board.cells.length)) throw new Error("Choose a 5 × 5 or 7 × 7 bingo board file.");
    clearBingoRandomizerUndo();
    bingoDraft = normalizeBingoBoard({...board, id: null}); bingoDirty = true; selectedBingoCell = null; selectedBingoMonster = null;
    persistBingoDraft(); renderSavedBingoBoards(); renderBingoBoard(); renderBingoCatalog(); renderBingoTeams();
    setStatus(byId("bingo-status"), `Imported “${bingoDraft.title}”. Save the board to keep it in this browser.`, "success");
  } catch (error) { setStatus(byId("bingo-status"), `Could not import this board: ${error.message}`, "error"); }
  finally { byId("import-bingo-file").value = ""; }
});
const customTileDialog = byId("custom-tile-dialog");
byId("create-custom-tile").addEventListener("click", () => {
  byId("custom-tile-form").reset(); setStatus(byId("custom-tile-status"), ""); customTileDialog.showModal();
  setTimeout(() => byId("custom-tile-name").focus(), 30);
});
byId("custom-tile-close").addEventListener("click", () => customTileDialog.close());
byId("custom-tile-cancel").addEventListener("click", () => customTileDialog.close());
byId("custom-tile-form").addEventListener("submit", event => {
  event.preventDefault();
  const name = byId("custom-tile-name").value.trim();
  if (!name) { setStatus(byId("custom-tile-status"), "Enter a name for this tile.", "error"); return; }
  const tile = {id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, name: name.slice(0, 32)};
  bingoDraft.customTiles.unshift(tile); selectedBingoMonster = tile.id; selectedBingoCell = null; bingoDirty = true; persistBingoDraft();
  byId("bingo-search").value = ""; renderBingoCatalog(); customTileDialog.close();
  setBingoHint(`${tile.name} created and selected. Tap a square or drag it onto the board.`);
  setStatus(byId("bingo-status"), `Custom tile “${tile.name}” added to this board’s library.`, "success");
});
byId("bingo-unassigned").addEventListener("dragover", event => event.preventDefault());
byId("bingo-unassigned").addEventListener("drop", event => {
  event.preventDefault(); const username = event.dataTransfer.getData("application/x-bingo-member");
  const member = bingoDraft.teams.flatMap(team => team.members).find(player => player.username === username);
  if (member) assignBingoMember(member, null);
});
byId("bingo-unassigned").addEventListener("click", event => {
  if (event.target === byId("bingo-unassigned") && selectedBingoMember) assignBingoMember(selectedBingoMember, null);
});
renderSavedBingoBoards(); renderBingoBoard(); renderBingoCatalog(); renderBingoTeams();
if ("ResizeObserver" in window) {
  const bingoBoardResizeObserver = new ResizeObserver(() => requestAnimationFrame(fitBingoCellLabels));
  bingoBoardResizeObserver.observe(byId("bingo-board"));
}

function askConfirmation(title, copy, confirmText, danger = false) {
  return new Promise(resolve => {
    byId("confirm-title").textContent = title;
    byId("confirm-copy").textContent = copy;
    const yes = byId("confirm-yes"); yes.textContent = confirmText; yes.className = "button " + (danger ? "danger" : "primary");
    confirmDialog.addEventListener("close", () => resolve(confirmDialog.returnValue === "yes"), {once: true});
    confirmDialog.showModal();
  });
}
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));

