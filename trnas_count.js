async function fetchData() {
  const input = document.getElementById("inputValue").value.trim();
  const loadingMessage = document.getElementById("loadingMessage");
  const totalDownloadsElement = document.getElementById("totalDownloads");
  const mostDownloadedElement = document.getElementById("mostDownloaded");
  const resultsTable = document.getElementById("resultsTable");
  const errorMessage = document.getElementById("errorMessage");

  // Reset previous results
  loadingMessage.style.display = "block";
  resultsTable.innerHTML = "";
  totalDownloadsElement.textContent = "";
  mostDownloadedElement.textContent = "";
  errorMessage.textContent = "";

  if (!input) {
    errorMessage.textContent = "⚠️ Please enter a translator name!";
    loadingMessage.style.display = "none";
    return;
  }

  try {
    // Convert name to tag format
    const tag = input.toLowerCase().replace(/\s+/g, '-');

    // Fetch tag ID and count
    const tagResponse = await fetch(
      `https://malayalamsubtitles.org/wp-json/wp/v2/tags?search=${tag}`
    );

    if (!tagResponse.ok) {
      throw new Error("Failed to fetch tag data");
    }

    const tagData = await tagResponse.json();

    // Filter tags for exact match
    const matchingTags = tagData.filter(tag => tag.name.toLowerCase() === input.toLowerCase());

    if (matchingTags.length === 0) {
      throw new Error("അക്ഷരം വല്ലതും തെറ്റിപ്പോയോ? ഈ പേര് സൈറ്റിലെ ടാഗിലുള്ള പോലെ പേരടിക്കണം.");
    }

    const { id: tagId, count: totalPostsCount } = matchingTags[0]; // Use the exact match tag ID and count

    // Calculate the total number of pages
    const perPage = 100;
    const totalPages = Math.ceil(totalPostsCount / perPage);

    let totalDownloads = 0;
    let mostDownloaded = { title: "None", downloads: 0 };
    const results = [];

    // Fetch posts across multiple pages if there are more than 100 posts
    for (let page = 1; page <= totalPages; page++) {
      const postsResponse = await fetch(
        `https://malayalamsubtitles.org/wp-json/wp/v2/posts?tags=${tagId}&per_page=${perPage}&page=${page}`
      );

      if (!postsResponse.ok) {
        throw new Error("Failed to fetch posts data");
      }

      const posts = await postsResponse.json();

      for (const post of posts) {
        const contentHtml = post.content?.rendered || "";
        const match = contentHtml.match(/wpdmdl=(\d+)/);
        const downloadId = match ? match[1] : null;

        if (downloadId) {
          const downloadResponse = await fetch(
            `https://malayalamsubtitles.org/wp-json/wpdm/v1/packages/${downloadId}`
          );

          if (downloadResponse.ok) {
            const downloadData = await downloadResponse.json();
            const downloadCount = downloadData.download_count || 0;
            totalDownloads += downloadCount;

            results.push({
              title: post.title.rendered,
              downloads: downloadCount,
            });

            if (downloadCount > mostDownloaded.downloads) {
              mostDownloaded = { title: post.title.rendered, downloads: downloadCount };
            }
          }
        }
      }
    }

    totalDownloadsElement.textContent = `${input}'s Total Downloads: ${totalDownloads}`;
    mostDownloadedElement.textContent = `${input}'s Most Downloaded Subtitle: ${mostDownloaded.title}`;

    results.forEach((item, index) => {
      const row = `<tr>
        <td>${index + 1}</td>
        <td>${item.title}</td>
        <td>${item.downloads}</td>
      </tr>`;
      resultsTable.innerHTML += row;
    });
  } catch (error) {
    console.error(error);
    errorMessage.textContent = `❌ ${error.message}`;
  } finally {
    loadingMessage.style.display = "none";
  }
}

let sortOrder = 1;

function sortTable(columnIndex) {
  const table = document.querySelector("table tbody");
  const rows = Array.from(table.rows);

  rows.sort((a, b) => {
    const cellA = a.cells[columnIndex].textContent;
    const cellB = b.cells[columnIndex].textContent;

    if (columnIndex === 0 || columnIndex === 2) {
      return sortOrder * (parseInt(cellA) - parseInt(cellB));
    } else {
      return sortOrder * cellA.localeCompare(cellB);
    }
  });

  table.innerHTML = "";
  rows.forEach((row) => table.appendChild(row));

  sortOrder *= -1;
}
