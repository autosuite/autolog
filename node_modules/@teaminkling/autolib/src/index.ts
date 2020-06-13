import fs from 'fs';

import * as core from '@actions/core';
import * as exec from '@actions/exec';

/*
 * -------------------------------------------------------------------------------------------------------------------
 * - Constants. ------------------------------------------------------------------------------------------------------
 * -------------------------------------------------------------------------------------------------------------------
 */

/**
 * The regular expression that represents a version release.
 *
 * For example, `v0.11.5-beta+17-2020-05-12` will provide parts:
 *
 * - `0`: `0`
 * - `1`: `11`
 * - `2`: `5`
 * - `3`: `-beta+17-2020-05-12`
 */
export const SEMVER_REGEXP: RegExp = /v?(\d)\.(\d)\.\d)(.*)/;

/*
 * -------------------------------------------------------------------------------------------------------------------
 * - Classes. --------------------------------------------------------------------------------------------------------
 * -------------------------------------------------------------------------------------------------------------------
 */

/** A [[RegExp]] to [[string]] replacement map for use on a file. */
export class ReplacementMap {
    /** The regular expression to match and replace. */
    matcher: RegExp;

    /** The literal replacement to use to replace the given regular expression. */
    replacement: string;

    constructor(matcher: RegExp, replacement: string) {
        this.matcher = matcher;
        this.replacement = replacement;
    }
};

/** A basic concrete representation of a Semantic Version. */
export class SemVer {
    /** The major version. */
    major: number;
    /** The minor number. */
    minor: number;
    /** The patch number. */
    patch: number;
    /** The information string, if applicable. */
    info: string | null;

    constructor(major: number, minor: number, patch: number, info: string | null) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
        this.info = info;
    }

    /**
     * From a textual version, create a [SemVer].
     *
     * These might be something like `0.31.5` or `2.0.0-some_info_here+2020-03-01`, for example.
     *
     * @param text the textual version
     */
    static constructFromText(text: string): SemVer {
        const match: RegExpMatchArray | null = text.match(SEMVER_REGEXP);

        if (!match) {
            throw Error(`Provided text is not valid SemVer: [${text}]`);
        }

        const major: number = parseInt(match[0]);
        const minor: number = parseInt(match[1]);
        const patch: number = parseInt(match[2]);

        /* Force set to null if falsey (empty string). */

        const info: string | null = match[3] || null;

        return new SemVer(major, minor, patch, info);
    }

    /**
     * Return the "zero version" as a [SemVer].
     */
    static constructZero(): SemVer {
        return new SemVer(0, 0, 0, null);
    }

    /**
     * Return "true" if this is a "zero version".
     */
    isZero() {
        return (this.major === 0 && this.minor === 0 && this.patch === 0 && this.info == null)
    }

    toString() {
        return `${this.major}.${this.minor}.${this.patch}${this.info}`;
    }
};

/*
 * -------------------------------------------------------------------------------------------------------------------
 * - Utilities. ------------------------------------------------------------------------------------------------------
 * -------------------------------------------------------------------------------------------------------------------
 */

/**
 * Given a file, perform replacements based on the [ReplacementMap] and write.
 *
 * @param filename the file's name
 * @param replacements the [Array] of [ReplacementMap]s
 */
export async function rewriteFileContentsWithReplacements(
    filename: string, replacements: Array<ReplacementMap>
): Promise<void> {
    fs.exists(filename, function (exists: boolean) {
        if (exists) {
            /* If the file exists, we can perform the replacement by reading from the file first: */

            fs.readFile(filename, (_, data: Buffer) => {
                let replaced: string = data.toString();

                replacements.forEach(replaceMap => {
                    replaced = replaced.replace(replaceMap.matcher, replaceMap.replacement);
                })

                fs.writeFile(filename, replaced, (_) => null);
            });
        } else {
            /* If the file does not exist, we produce a warning and stop. */

            core.warning(`Cannot perform replace-rewrite of file that does not exist: ${filename}.`);
        }
    });
}

/**
 * Given a file, perform a single replacement based on the matcher and replacement.
 *
 * @param filename the file's name
 * @param matcher the matcher [RegExp]
 * @param replacement the replacement [string]
 */
export async function rewriteFileContentsWithReplacement(
    filename: string, matcher: RegExp, replacement: string
): Promise<void> {
    await rewriteFileContentsWithReplacements(filename, [new ReplacementMap(matcher, replacement)]);
}

/**
 * Given [[string]] of newline-delimited tags, find the latest SemVer tag and return it.
 *
 * We need to iterate all anyway to ignore all the useless values, so let's not define a comparator.
 *
 * Note the example: `1.0.0-rc2 < 1.0.0`.
 *
 * @param tags the tags from which to find the latest SemVer version
 * @param stableOnly if the function should ignore all prerelease/build info-appended versions
 * @returns a SemVer representation as a 4-ary [[Tuple]] of 3 [[number]]s and 1 optional [[string]]
 */
export async function findLatestSemVerUsingString(tags: string, stableOnly: boolean): Promise<SemVer> {
    let largestSeen: SemVer = new SemVer(0, 0, 0, null);

    tags.split("\n").forEach(async (tag: string) => {
        core.info(`Found tag: [${tag}].`);

        try {
            const candidate: SemVer = SemVer.constructFromText(tag);

            /* Skip if not stable and stableOnly is true. */

            if (stableOnly && candidate.info) {
                return;
            }

            largestSeen = await compareSemVer(largestSeen, candidate);
        } catch {
            return;
        }
    });

    return largestSeen;
}

/**
 * Determine the largest seen Semantic Version.
 *
 * TODO: Look up ways to make SemVer generically comparable.
 *
 * @param largestSeen the largest seen (so far) version
 * @param current the current version to compare
 */
export async function compareSemVer(largestSeen: SemVer, current: SemVer): Promise<SemVer> {
    const majorIsSame: boolean = current.major == largestSeen.major;
    const majorIsNewer: boolean = current.major > largestSeen.major;

    const minorIsSame: boolean = current.minor == largestSeen.minor;
    const minorIsNewer: boolean = current.minor > largestSeen.minor;

    const patchIsSame: boolean = current.patch == largestSeen.patch;
    const patchIsNewer: boolean = current.patch > largestSeen.patch;

    const infoExisted: boolean = largestSeen.info != null;
    const infoLexicallyGreater: boolean = (
        current.info != null && largestSeen.info != null && current.info.localeCompare(largestSeen.info) == 1
    );

    if (majorIsNewer) {
        /* A bigger major number is found. */

        return current;
    } else if (majorIsSame) {
        /* Minor is the same and the patch is greater. */

        const patchVersionIncrement: boolean = minorIsSame && patchIsNewer;

        /* The SemVer string is the same but there is no new extra info. */

        const stableVersionIncrement: boolean = minorIsSame && patchIsSame && !current.info && infoExisted;

        if (minorIsNewer || patchVersionIncrement || stableVersionIncrement || infoLexicallyGreater) {
            return current;
        }
    }

    return largestSeen;
}

/**
 * Using `git` tags, find the latest version (if this is possible).
 *
 * If no version is found, just return 0.0.0 with no info associated.
 *
 * @param stableOnly whether we should only extract stable versions
 */
export async function findLatestVersionFromGitTags(stableOnly: boolean): Promise<SemVer> {
    let text: SemVer | null = null;

    try {
        await exec.exec('git fetch --tags');
        await exec.exec('git tag', [], {
            listeners: {
                stdout: async (data: Buffer) => {
                    text = await findLatestSemVerUsingString(data.toString(), stableOnly);
                }
            }
        });
    } catch {
        core.warning("Complaint git tag cannot be found. Returning 0.0.0.");
    }

    if (!text) {
        return SemVer.constructZero();
    }

    return text;
}
