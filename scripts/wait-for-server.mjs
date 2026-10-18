for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const response = await fetch("http://localhost:3000/api/ready", {
      signal: AbortSignal.timeout(1000),
    });
    if (response.ok) process.exit(0);
  } catch {
    /* The server may still be starting. */
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
throw Error("The website did not become ready");
