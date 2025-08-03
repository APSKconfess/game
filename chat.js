// Sidebar toggle for chat page
document.getElementById("menu-btn").onclick = () => {
  const sidebar = document.getElementById("sidebar");
  if (sidebar.style.width === "250px") {
    sidebar.style.width = "0";
  } else {
    sidebar.style.width = "250px";
  }
};

document.getElementById("close-btn").onclick = () => {
  document.getElementById("sidebar").style.width = "0";
};
