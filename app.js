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
  const connected = Boolean(settings.allowRequests && settings.groupId);
  [byId("connection-label"), byId("mobile-connection")].forEach(node => {
    node.classList.toggle("connected", connected);
    if (node.id === "connection-label") node.textContent = connected ? "Requests enabled" : "Not connected";
    if (node.id === "mobile-connection") node.title = connected ? "Wise Old Man requests enabled" : "Wise Old Man requests disabled";
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
function requireRequests() {
  if (!settings.allowRequests) {
    toast("Enable Wise Old Man requests in Configuration first.");
    return false;
  }
  return true;
}
function requireGroupAndCode() {
  if (!requireRequests()) return false;
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
  if (!requireGroupAndCode()) { setStatus(result, "Choose a group, enter its verification code, and enable requests in Configuration.", "error"); return; }
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
  byId("allow-requests").checked = Boolean(settings.allowRequests);
  updateGroupDisplay(); updateConnectionDisplay();
}
populateConfiguration();
byId("allow-requests").addEventListener("change", () => {
  settings.allowRequests = byId("allow-requests").checked;
  persistSettings();
  if (settings.allowRequests) toast("Wise Old Man requests are enabled on this device.");
});
byId("verification").addEventListener("input", () => {
  settings.verification = byId("verification").value.trim();
  persistSettings();
});
byId("save-config").addEventListener("click", () => {
  settings.verification = byId("verification").value.trim();
  settings.allowRequests = byId("allow-requests").checked;
  persistSettings();
  setStatus(byId("config-result"), "Configuration saved in this browser on this device.", "success");
  toast("Configuration saved.");
});
byId("search-groups").addEventListener("click", async () => {
  const query = byId("group-search").value.trim();
  const results = byId("group-results"); results.replaceChildren();
  if (!query) { setStatus(byId("config-result"), "Type a clan name before searching.", "error"); return; }
  if (!requireRequests()) { setStatus(byId("config-result"), "Enable Wise Old Man requests above and save before searching.", "error"); return; }
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
  const confirmed = await askConfirmation("Clear saved configuration?", "This removes the selected group, verification code, and request setting from this browser.", "Clear settings", true);
  if (!confirmed) return;
  settings = {}; persistSettings(); populateConfiguration(); byId("group-results").replaceChildren();
  setStatus(byId("config-result"), "Saved configuration cleared.", "success");
});
if (settings.groupId && settings.allowRequests && !settings.groupName) {
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
    roleIcon.src = `https://wiseoldman.net/img/group_roles/${encodeURIComponent(iconRole)}.png`;
    roleIcon.alt = `${pretty(member.role || "member")} rank icon`; roleIcon.loading = "lazy"; roleIcon.decoding = "async";
    roleIcon.addEventListener("error", () => { roleIcon.src = "https://wiseoldman.net/img/fallback-icon.png"; roleIcon.alt = "Wise Old Man rank icon"; }, {once: true});
    avatar.append(roleIcon);
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
  if (!requireGroupAndCode()) return;
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
