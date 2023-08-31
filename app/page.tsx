import styles from '../styles/home.module.css';

export default function Page() {
  return (
    <main>
      <div className={styles.hero}>
        <h1>
          <span className={styles.line}>
            Hi there! <span className={styles.wave}>👋</span>{' '}
          </span>
          <span className={styles.line}>I'm Hugo Striedinger</span>
        </h1>
        <h2>Senior Software Engineer</h2>
        <h3>
          <a
            href='https://www.twitter.com'
            target='_blank'
            rel='noopener noreferrer'
          >
            Twitter Inc. / X Corp.
          </a>
        </h3>
        <h4>📍 New York, NY</h4>
      </div>
      <ul className={styles.links}>
        <li>
          <a href='mailto:striedinger+www@outlook.com'>
            <img
              src='data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIxIC0zNSA1MTEuOTk5OTMgNTExIiB3aWR0aD0iNTEycHgiIGhlaWdodD0iNTEycHgiPjxwYXRoIGQ9Im0xMjEuNDUzMTI1IDI1My4xNzE4NzUgNjMuNTU0Njg3IDE1OC44ODY3MTkgODIuNzUtODIuNzUzOTA2IDE0MS41MzUxNTcgMTEyLjUwMzkwNiAxMDIuNzA3MDMxLTQ0MS4zMDg1OTQtNTEyIDIwNS40ODA0Njl6bS0zOS45MzM1OTQtNDcuNjQwNjI1IDI0NC4wNDY4NzUtOTcuOTQ1MzEyLTE5NC4wNzQyMTggMTE3LjM2MzI4MXptMjg3LjUzNTE1Ny04OS4yNS0xNjEuOTgwNDY5IDE0OC4xODc1LTE5LjQ4NDM3NSA3My40MjU3ODEtMzYuMDM1MTU2LTkwLjA4NTkzN3ptLTE0OS44NTE1NjMgMjE5LjIzMDQ2OSA5LjgxNjQwNi0zNi45OTYwOTQgMTUuMTQ0NTMxIDEyLjAzNTE1NnptMTcxLjY1NjI1IDUzLjM5NDUzMS0xNDcuMzg2NzE5LTExNy4xNTIzNDQgMjIxLjkwMjM0NC0yMDMuMDA3ODEyem0wIDAiIGZpbGw9IiMwMDAwMDAiLz48L3N2Zz4K'
              alt='Contact e-mail link'
            />
          </a>
        </li>
        <li>
          <a
            href='https://twitter.com/striedinger'
            target='_blank'
            rel='noopener noreferrer'
          >
            <img
              src='data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIC00NyA1MTIuMDAwMDQgNTEyIiB3aWR0aD0iNTEycHgiIGhlaWdodD0iNTEycHgiPjxwYXRoIGQ9Im01MTIgNTUuOTY0ODQ0Yy0zMi4yMDcwMzEgMS40ODQzNzUtMzEuNTAzOTA2IDEuMzYzMjgxLTM1LjE0NDUzMSAxLjY2Nzk2OGwxOS4wNzQyMTktNTQuNDcyNjU2cy01OS41MzkwNjMgMjEuOTAyMzQ0LTc0LjYzMjgxMyAyNS44MjAzMTNjLTM5LjY0MDYyNS0zNS42Mjg5MDctOTguNTYyNS0zNy4yMDMxMjUtMTQwLjY4NzUtMTEuMzEyNS0zNC40OTYwOTQgMjEuMjA3MDMxLTUzLjAxMTcxOSA1Ny42MjUtNDYuODM1OTM3IDEwMC4xOTE0MDYtNjcuMTM2NzE5LTkuMzE2NDA2LTEyMy43MDMxMjYtNDEuMTQwNjI1LTE2OC4zNjMyODItOTQuNzg5MDYzbC0xNC4xMjUtMTYuOTY0ODQzLTEwLjU1NDY4NyAxOS4zODI4MTJjLTEzLjMzOTg0NCAyNC40OTIxODgtMTcuNzY5NTMxIDUyLjQ5NjA5NC0xMi40NzY1NjMgNzguODUxNTYzIDIuMTcxODc1IDEwLjgxMjUgNS44NjMyODIgMjEuMTI1IDEwLjk3NjU2MyAzMC43ODEyNWwtMTIuMTE3MTg4LTQuNjk1MzEzLTEuNDM3NSAyMC4yNDYwOTRjLTEuNDU3MDMxIDIwLjU2NjQwNiA1LjM5MDYyNSA0NC41NzQyMTkgMTguMzIwMzEzIDY0LjIxNDg0NCAzLjY0MDYyNSA1LjUzMTI1IDguMzI4MTI1IDExLjYwNTQ2OSAxNC4yNjk1MzEgMTcuNTk3NjU2bC02LjI2MTcxOS0uOTYwOTM3IDcuNjQwNjI1IDIzLjE5OTIxOGMxMC4wNDI5NjkgMzAuNDgwNDY5IDMwLjkwMjM0NCA1NC4wNjI1IDU3Ljk3MjY1NyA2Ny4xNzE4NzUtMjcuMDM1MTU3IDExLjQ3MjY1Ny00OC44NzUgMTguNzkyOTY5LTg0Ljc3MzQzOCAzMC42MDE1NjNsLTMyLjg0Mzc1IDEwLjc5Njg3NSAzMC4zMzU5MzggMTYuNTg1OTM3YzExLjU2NjQwNiA2LjMyNDIxOSA1Mi40Mzc1IDI3LjQ0NTMxMyA5Mi44MjAzMTIgMzMuNzgxMjUgODkuNzY1NjI1IDE0LjA3ODEyNSAxOTAuODMyMDMxIDIuNjEzMjgyIDI1OC44NzEwOTQtNTguNjY0MDYyIDU3LjMwODU5NC01MS42MTMyODIgNzYuMTEzMjgxLTEyNS4wMzEyNSA3Mi4yMDcwMzEtMjAxLjQzMzU5NC0uNTg5ODQ0LTExLjU2NjQwNiAyLjU3ODEyNS0yMi42MDU0NjkgOC45MjE4NzUtMzEuMDc4MTI1IDEyLjcwNzAzMS0xNi45NjQ4NDQgNDguNzY1NjI1LTY2LjQwNjI1IDQ4Ljg0Mzc1LTY2LjUxOTUzMXptLTcyLjgzMjAzMSA0OC41NTA3ODFjLTEwLjUzNTE1NyAxNC4wNjY0MDYtMTUuODEyNSAzMi4wMzEyNS0xNC44NjcxODggNTAuNTc4MTI1IDMuOTQxNDA3IDc3LjA2NjQwNi0xNy4wMjczNDMgMTM2LjgzMjAzMS02Mi4zMjgxMjUgMTc3LjYyODkwNi01Mi45MTc5NjggNDcuNjYwMTU2LTEzOC4yNzM0MzcgNjYuMzY3MTg4LTIzNC4xNzE4NzUgNTEuMzI0MjE5LTE3LjM2NzE4Ny0yLjcyMjY1Ni0zNS4zMTY0MDYtOC44MjAzMTMtNTAuMTcxODc1LTE0LjkxMDE1NiAzMC4wOTc2NTYtMTAuMzU1NDY5IDUzLjMzOTg0NC0xOS41ODU5MzggOTAuODc1LTM3LjM1MTU2M2w1Mi4zOTg0MzgtMjQuODAwNzgxLTU3Ljg1MTU2My0zLjcwMzEyNWMtMjcuNzEwOTM3LTEuNzczNDM4LTUwLjc4NTE1Ni0xNS4yMDMxMjUtNjQuOTY4NzUtMzcuMDA3ODEyIDcuNTMxMjUtLjQzNzUgMTQuNzkyOTY5LTEuNjU2MjUgMjIuMDIzNDM4LTMuNjcxODc2bDU1LjE3NTc4MS0xNS4zNjcxODctNTUuNjM2NzE5LTEzLjYyNWMtMjcuMDM1MTU2LTYuNjIxMDk0LTQyLjQ0NTMxMi0yMi43OTY4NzUtNTAuNjEzMjgxLTM1LjIwMzEyNS01LjM2MzI4MS04LjE1MjM0NC04Ljg2NzE4OC0xNi41MDM5MDYtMTAuOTY4NzUtMjQuMjAzMTI1IDUuNTc4MTI1IDEuNDk2MDk0IDEyLjA4MjAzMSAyLjU2MjUgMjIuNTcwMzEyIDMuNjAxNTYzbDUxLjQ5NjA5NCA1LjA5Mzc1LTQwLjgwMDc4MS0zMS44MjgxMjZjLTI5LjM5ODQzNy0yMi45Mjk2ODctNDEuMTc5Njg3LTU3LjM3ODkwNi0zMi41NDI5NjktOTAuNDk2MDkzIDkxLjc1IDk1LjE2NDA2MiAxOTkuNDc2NTYzIDg4LjAxMTcxOSAyMTAuMzIwMzEzIDkwLjUyNzM0My0yLjM4NjcxOS0yMy4xODM1OTMtMi40NDkyMTktMjMuMjM4MjgxLTMuMDc0MjE5LTI1LjQ0NTMxMi0xMy44ODY3MTktNDkuMDg5ODQ0IDE2LjU0Njg3NS03NC4wMTU2MjUgMzAuMjczNDM4LTgyLjQ1MzEyNSAyOC42NzE4NzQtMTcuNjIxMDk0IDc0LjE4MzU5My0yMC4yNzczNDQgMTA1LjcwNzAzMSA4Ljc1MzkwNiA2LjgwODU5MyA2LjI2NTYyNSAxNi4wMTU2MjUgOC43MzA0NjkgMjQuNjMyODEyIDYuNTg5ODQ0IDcuNzM0Mzc1LTEuOTIxODc1IDE0LjA4MjAzMS0zLjk1NzAzMSAyMC4yOTY4NzUtNi4xNzE4NzVsLTEyLjkzNzUgMzYuOTQ1MzEyIDE2LjUxNTYyNS4wMTE3MTljLTMuMTE3MTg3IDQuMTc5Njg4LTYuODU1NDY5IDkuMTgzNTk0LTExLjM1MTU2MiAxNS4xODM1OTR6bTAgMCIgZmlsbD0iIzAwMDAwMCIvPjwvc3ZnPgo='
              alt='Twitter profile'
            />
          </a>
        </li>
        <li>
          <a
            href='https://instagram.com/striedingerh'
            target='_blank'
            rel='noopener noreferrer'
          >
            <img
              src='data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgd2lkdGg9IjUxMnB4IiBoZWlnaHQ9IjUxMnB4Ij48cGF0aCBkPSJtNzUgNTEyaDM2MmM0MS4zNTU0NjkgMCA3NS0zMy42NDQ1MzEgNzUtNzV2LTM2MmMwLTQxLjM1NTQ2OS0zMy42NDQ1MzEtNzUtNzUtNzVoLTM2MmMtNDEuMzU1NDY5IDAtNzUgMzMuNjQ0NTMxLTc1IDc1djM2MmMwIDQxLjM1NTQ2OSAzMy42NDQ1MzEgNzUgNzUgNzV6bS00NS00MzdjMC0yNC44MTI1IDIwLjE4NzUtNDUgNDUtNDVoMzYyYzI0LjgxMjUgMCA0NSAyMC4xODc1IDQ1IDQ1djM2MmMwIDI0LjgxMjUtMjAuMTg3NSA0NS00NSA0NWgtMzYyYy0yNC44MTI1IDAtNDUtMjAuMTg3NS00NS00NXptMCAwIiBmaWxsPSIjMDAwMDAwIi8+PHBhdGggZD0ibTI1NiAzOTFjNzQuNDM3NSAwIDEzNS02MC41NjI1IDEzNS0xMzVzLTYwLjU2MjUtMTM1LTEzNS0xMzUtMTM1IDYwLjU2MjUtMTM1IDEzNSA2MC41NjI1IDEzNSAxMzUgMTM1em0wLTI0MGM1Ny44OTg0MzggMCAxMDUgNDcuMTAxNTYyIDEwNSAxMDVzLTQ3LjEwMTU2MiAxMDUtMTA1IDEwNS0xMDUtNDcuMTAxNTYyLTEwNS0xMDUgNDcuMTAxNTYyLTEwNSAxMDUtMTA1em0wIDAiIGZpbGw9IiMwMDAwMDAiLz48cGF0aCBkPSJtNDA2IDE1MWMyNC44MTI1IDAgNDUtMjAuMTg3NSA0NS00NXMtMjAuMTg3NS00NS00NS00NS00NSAyMC4xODc1LTQ1IDQ1IDIwLjE4NzUgNDUgNDUgNDV6bTAtNjBjOC4yNjk1MzEgMCAxNSA2LjczMDQ2OSAxNSAxNXMtNi43MzA0NjkgMTUtMTUgMTUtMTUtNi43MzA0NjktMTUtMTUgNi43MzA0NjktMTUgMTUtMTV6bTAgMCIgZmlsbD0iIzAwMDAwMCIvPjwvc3ZnPgo='
              alt='Instagram profile'
            />
          </a>
        </li>
      </ul>
    </main>
  );
}
