function saveData(d) { localStorage.setItem('workoutData', JSON.stringify(d)); }
function loadData() { const d = localStorage.getItem('workoutData'); return d ? JSON.parse(d) : {}; }

const data = loadData();
const groupsContainer = document.getElementById('groups');
const groupTpl = document.getElementById('group-template');

const editModal = document.getElementById('editModal');
const editExInput = document.getElementById('edit-exercise');
const editSetsInput = document.getElementById('edit-sets');
const editRepsInput = document.getElementById('edit-reps');
const saveEditBtn = document.getElementById('saveEdit');
const cancelEditBtn = document.getElementById('cancelEdit');
let currentEdit = null;

let viewMode = {};

function render() {
  groupsContainer.innerHTML = '';
  Object.keys(data).forEach(groupName => {
    const groupElem = groupTpl.content.cloneNode(true);
    const div = groupElem.querySelector('.group');
    groupElem.querySelector('.group-title').textContent = groupName;

    const chartCanvas = groupElem.querySelector('.chart');
    const summaryP = groupElem.querySelector('.summary');
    const entryList = groupElem.querySelector('.entry-list');

    if (!viewMode[groupName]) viewMode[groupName] = 'week';
    groupElem.querySelector('.view-week').onclick = () => { viewMode[groupName] = 'week'; render(); };
    groupElem.querySelector('.view-month').onclick = () => { viewMode[groupName] = 'month'; render(); };

    groupElem.querySelector('.add-entry').onclick = () => {
      const ex = div.querySelector('.exercise').value.trim();
      const reps = parseInt(div.querySelector('.reps').value);
      const sets = parseInt(div.querySelector('.sets').value);
      if (!(ex && reps && sets)) return alert('Fill all!');
      data[groupName].push({ id: Date.now(), ex, reps, sets, date: new Date().toISOString() });
      saveData(data); render();
    };

    entryList.innerHTML = '';
    data[groupName].forEach(e => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = `${e.date.slice(0,10)} – ${e.ex}: ${e.sets}×${e.reps}`;
      li.appendChild(span);

      const editBtn = document.createElement('button');
      editBtn.textContent = "✏️";
      editBtn.onclick = () => {
        currentEdit = { entry: e, group: groupName };
        editExInput.value = e.ex;
        editSetsInput.value = e.sets;
        editRepsInput.value = e.reps;
        editModal.style.display = "flex";
      };
      li.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.textContent = "🗑️";
      delBtn.onclick = () => {
        if (confirm("Delete this entry?")) {
          data[groupName] = data[groupName].filter(x => x.id !== e.id);
          saveData(data); render();
        }
      };
      li.appendChild(delBtn);

      entryList.appendChild(li);
    });

    const now = new Date();
    let buckets = [];
    if (viewMode[groupName] === 'week') {
      const start = new Date(now - 6 * 24*60*60*1000);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start.getTime() + i * 24*60*60*1000);
        buckets.push({ label: d.toISOString().slice(0,10), entries: [] });
      }
    } else {
      for (let i = 1; i <= now.getDate(); i++) {
        buckets.push({ label: i.toString(), entries: [] });
      }
    }

    data[groupName].forEach(e => {
      const dt = new Date(e.date), day = dt.toISOString().slice(0,10);
      buckets.forEach(b => {
        if ((viewMode[groupName] === 'week' && b.label === day) ||
            (viewMode[groupName] === 'month' && day.endsWith('-'+b.label.padStart(2,'0')))) {
          b.entries.push(e);
        }
      });
    });

    const labels = buckets.map(b => b.label);
    const dataVol = buckets.map(b => b.entries.reduce((s, x) => s + x.reps * x.sets, 0));
    const byExercise = {};
    buckets.flatMap(b => b.entries).forEach(e => {
      byExercise[e.ex] = (byExercise[e.ex] || 0) + e.reps * e.sets;
    });

    new Chart(chartCanvas.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Volume', data: dataVol, backgroundColor: 'rgba(75,192,192,0.4)' }] },
      options: { responsive: true, maintainAspectRatio: false }
    });

    const total = dataVol.reduce((a,b)=>a+b,0);
    let sumText = `Total ${viewMode[groupName]} volume: ${total}. Breakdown: `;
    sumText += Object.entries(byExercise)
                     .map(([ex, vol]) => `${ex}(${vol})`).join(', ');
    summaryP.textContent = sumText;

    groupsContainer.appendChild(groupElem);
  });
}

saveEditBtn.onclick = () => {
  const { entry } = currentEdit;
  entry.ex = editExInput.value.trim();
  entry.sets = parseInt(editSetsInput.value);
  entry.reps = parseInt(editRepsInput.value);
  if (!entry.ex || !entry.sets || !entry.reps) return alert("All fields required!");
  saveData(data);
  editModal.style.display = "none";
  render();
};

cancelEditBtn.onclick = () => editModal.style.display = "none";
window.onclick = e => { if (e.target === editModal) editModal.style.display = "none"; };

document.getElementById('create-group').onclick = () => {
  const g = document.getElementById('new-group').value.trim();
  if (!g) return;
  if (!data[g]) {
    data[g] = [];
    saveData(data);
    viewMode[g] = 'week';
    document.getElementById('new-group').value = '';
    render();
  } else {
    alert('Group exists');
  }
};

render();
