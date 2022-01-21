package panda.reppy.flags;

import net.dv8tion.jda.api.entities.Member;

public class CommandCondition {

    /**
     * CommandCondition will hold requirements for a command to successfully execute.
     * These conditions can be one of the following:
     *  - User holds a role id
     *  - User holds a permission flag
     *  - User meets some other custom criteria?
     */

    private final String snowflake;
    private final SnowflakeType snowflakeType;
    // TODO Implement permission field

    /**
     *
     * @param snowflake String of the snowflake to check for
     * @param snowflakeType
     */
    public CommandCondition(final String snowflake, final SnowflakeType snowflakeType) {
        this.snowflake = snowflake;
        this.snowflakeType = snowflakeType;
    }

    // TODO Implement permission constructor

    public boolean meetsCondition(Member member) {
        if (snowflakeType == SnowflakeType.MEMBER_ID) {
            return member.getId().equals(snowflake);
        }
        if (snowflakeType == SnowflakeType.ROLE_ID) {
            return member.getRoles().contains(snowflake);
        }

        // TODO Implement permission check

        return false;
    }
}
