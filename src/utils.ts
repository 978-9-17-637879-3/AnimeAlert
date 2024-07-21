const axios = require("axios");

export async function getAnilistIDFromSearchString(searchString: string) {
  const searchQuery = `query ($search: String) { # Define which variables will be used in the query (id)
    Media (search: $search, type: ANIME) { # Insert our variables into the query arguments (id) (type: ANIME is hard-coded in the query)
      id
      title {
        romaji
        english
        native
      }
    }
  }`;

  const searchVariables = {
    search: searchString,
  };

  const searchResponse = await axios({
    url: "https://graphql.anilist.co",
    method: "POST",
    data: {
      query: searchQuery,
      variables: searchVariables,
    },
    validateStatus: () => true, // prevent axios from throwing an error when it gets an error HTTP code
  });

  if (searchResponse.status !== 200) {
    return { title: null, id: null, status: searchResponse.status };
  }

  return {
    title: searchResponse.data["data"]["Media"]["title"]["romaji"],
    id: searchResponse.data["data"]["Media"]["id"],
    status: searchResponse.status,
  };
}

export async function latestAiringEpisode(animeId: number) {
  const scheduleQuery =
    "query ($mediaId: Int) {AiringSchedule (mediaId: $mediaId, notYetAired: true){episode airingAt}}";
  const scheduleVariables = { mediaId: animeId };

  const scheduleResponse = await axios({
    url: "https://graphql.anilist.co",
    method: "POST",
    data: {
      query: scheduleQuery,
      variables: scheduleVariables,
    },
    validateStatus: () => true, // prevent axios from throwing an error when it gets an error HTTP code
  });

  if (scheduleResponse.status !== 200) {
    return {
      latestAiring: { episode: -1, airingAt: -1 },
      status: scheduleResponse.status,
    };
  }

  return {
    latestAiring: scheduleResponse.data["data"]["AiringSchedule"],
    status: scheduleResponse.status,
  };
}

export enum AiringDisplayMode {
  CONCISE,
  VERBOSE,
}

function unixTimestampToDiscordTimestamp(unixTimestamp: number): string {
  return `<t:${unixTimestamp}>`;
}

async function getAiringTimeString(
  animeId,
  displayMode: AiringDisplayMode
): Promise<string> {
  const { latestAiring, status: airingStatusResponseCode } =
    await latestAiringEpisode(animeId);

  if (airingStatusResponseCode === 404) {
    switch (displayMode) {
      case AiringDisplayMode.CONCISE:
        return ": not airing";
      case AiringDisplayMode.VERBOSE:
        return " is not airing";
    }
  }

  if (airingStatusResponseCode !== 200) {
    switch (displayMode) {
      case AiringDisplayMode.CONCISE:
        return `: got error code ${airingStatusResponseCode}`;
      case AiringDisplayMode.VERBOSE:
        return ` airs at ${airingStatusResponseCode}`;
    }
  }

  const discordTimestamp = unixTimestampToDiscordTimestamp(
    latestAiring["airingAt"]
  );

  switch (displayMode) {
    case AiringDisplayMode.CONCISE:
      return `: ${discordTimestamp}`;
    case AiringDisplayMode.VERBOSE:
      return ` airs at ${discordTimestamp}`;
  }
}

export async function getAiringString(
  animeId: number,
  animeTitle: string,
  displayMode: AiringDisplayMode
): Promise<string> {
  return `**${animeTitle}**${await getAiringTimeString(animeId, displayMode)}`;
}
