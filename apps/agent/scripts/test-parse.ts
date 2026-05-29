import { fetchSubmissionImages, parseSubmissionUrl } from "@agents-go/shared";
const url = "https://pump.fun/go/cb5404c1-2fd2-40d8-ad67-7b688ed9dcd6/submissions/05c8dda7-0afc-4dd4-9fad-edf507bcb604#:~:text=Submission-,Was%20good%20burger,-1";
console.log("parsed ids:", parseSubmissionUrl(url));
const imgs = await fetchSubmissionImages(url);
console.log("images found:", imgs.length);
imgs.forEach((u) => console.log("  ", u));
