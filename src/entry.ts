import './styles.css';
if (location.pathname.replace(/\/$/, '') === `${import.meta.env.BASE_URL}artifacts`) {
  import('./artifacts/ArtifactPage').then(({ startArtifacts }) => startArtifacts()).catch(error => {
    document.querySelector<HTMLElement>('#loading')!.hidden = true;
    const notice = document.querySelector<HTMLElement>('#error')!;
    notice.hidden = false; notice.textContent = `Unable to open artifacts: ${error.message}`;
  });
} else {
  void import('./main');
}
